const { colorRoles } = require('../../config')

const isColorValid = color => {
  return !!colorRoles[color]
}

module.exports = (colorCommand, message) => {
  const lowerCaseColorCommand = colorCommand.toLowerCase()

  if (lowerCaseColorCommand === 'list')
    message.channel.send('Your wish is my command! ^-^', {
      files: ['./src/media/role-colors.PNG'],
    })
  else if (isColorValid(lowerCaseColorCommand)) {
    const guildMember = message.guild.members.get(message.author.id)
    const currentRoles = Array.from(guildMember.roles.values()).map(x => x.id)
    const rolesToRemove = currentRoles.filter(x =>
      Object.values(colorRoles).includes(x)
    )

    guildMember
      .removeRoles(rolesToRemove)
      .then(() =>
        guildMember
          .addRole(colorRoles[lowerCaseColorCommand])
          .then(() =>
            message.reply(
              `your color has been changed to ${lowerCaseColorCommand}!~`
            )
          )
      )
  } else
    message.reply(
      "sorry, that isn't a valid color. :pepehands: Use `!color list` to see the list of available colors."
    )
}
