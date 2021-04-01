const { formatReply } = require('../utils')
const { getCommandLevelForChannel } = require('../repositories/channels')
const {
  getAllCoordinates,
  coordinateExistsByName,
  setCoordinates,
  getCoordinatesByOwner,
  getCoordinatesByName,
  deleteCoordinatesByName,
} = require('../repositories/coordinates')
const { isInt } = require('validator')

const isCoordinateSetValid = coordinates => {
  return coordinates.every(coordinate => {
    return isInt(coordinate)
  })
}

module.exports = async (args, { message, guild, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const formatCoordinateList = coordinates => {
    return coordinates
      .map(coordinate => {
        const ownerNickname = guild.members.cache.find(member => {
          return member.user.tag === coordinate.owner
        }).nickname

        return `\n**${coordinate.name}** (${ownerNickname}): \`${coordinate.x}, ${coordinate.y}, ${coordinate.z}\``
      })
      .join('')
  }

  const separatedArgs = args.split(' ')

  if (args === '!coords') {
    const coordinates = await getAllCoordinates()

    message.reply(
      formatReply(
        "here's all coordinates:" + formatCoordinateList(coordinates),
        isDirectMessage
      )
    )
  } else if (separatedArgs[0] === 'set') {
    const isNameInUse = await coordinateExistsByName(args[1])
    if (isNameInUse)
      return message.reply(
        formatReply(
          'uh oh! There is already something saved with that name! Coordinates must have unique names.'
        )
      )

    const [command, x, y, z, ...separatedName] = separatedArgs
    const name = separatedName.join(' ')
    const owner = message.author.tag
    if (!isCoordinateSetValid([x, y, z]))
      return message.reply(
        formatReply(
          'uh oh! Invalid format! The correct format is: `!coords set <x> <y> <x> <name>`'
        )
      )
    const savedCoordinates = await setCoordinates([name, owner, x, y, z])
    message.reply(
      formatReply(
        `saved ${savedCoordinates[0].name} at ${savedCoordinates[0].x}, ${savedCoordinates[0].y}, ${savedCoordinates[0].z}!`,
        isDirectMessage
      )
    )
  } else if (separatedArgs[0] === 'user') {
    const userTag = separatedArgs[1]
    const coordinates = await getCoordinatesByOwner(userTag)

    if (!coordinates.length)
      return message.reply(
        formatReply(
          `hmm... I can't find any coordinates for ${userTag}...`,
          isDirectMessage
        )
      )

    message.reply(
      formatReply(
        'here are the coordinates for that user:' +
          formatCoordinateList(coordinates),
        isDirectMessage
      )
    )
  } else if (separatedArgs[0] === 'get') {
    const name = separatedArgs.slice(1).join(' ')
    const coordinates = await getCoordinatesByName(name)

    message.reply(
      `${name} is located at: \`${coordinates.x}, ${coordinates.y}, ${coordinates.z}\``
    )
  } else if (separatedArgs[0] === 'delete') {
    const name = separatedArgs.slice(1).join(' ')
    const existingCoordinate = await getCoordinatesByName(name)
    if (!existingCoordinate)
      return message.reply(
        formatReply(
          "I couldn't find a coordinate set with that name...",
          isDirectMessage
        )
      )
    else if (existingCoordinate.owner !== message.author.tag)
      return message.reply(
        formatReply("You don't own that coordinate set!", isDirectMessage)
      )

    await deleteCoordinatesByName(name)
    message.reply(`${name} has been deleted.`)
  } else {
    message.reply(
      formatReply(
        `sorry, ${separatedArgs[0]} is not a valid coordinate command. Try one of these: 
        \n - \`!coords\` - Returns the full list of saved coordinates
        \n - \`!coords set <x> <y> <x> <name>\` - Saves the coordinates under the given name (ex: \`!coords set 100 50 200 Jungle Temple\`)
        \n - \`!coords user <username with hash>\` - Returns the list of coordinates the specified discord user has saved (ex: \`!coords user Gloogo#0001\`)
        \n - \`!coords get <name>\` - Returns the coordinates with the provided name (ex: \`!coords get Jungle Temple\`)
        \n - \`!coords delete <name>\` - Deletes the coordiates with the provided name (ex: \`!coords delete Jungle Temple\`)`,
        isDirectMessage
      )
    )
  }
}
