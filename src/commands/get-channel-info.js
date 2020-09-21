const {
  getJoinableChannels,
  getCommandLevelForChannel,
} = require('../repositories/channels')
const { formatReply } = require('../utils')

const getChannelsInCategories = async () => {
  const channels = await getJoinableChannels()
  let categorizedChannelsDictionary = {}

  channels.forEach(channel => {
    if (categorizedChannelsDictionary[channel.categoryName])
      categorizedChannelsDictionary[channel.categoryName].push(channel.name)
    else categorizedChannelsDictionary[channel.categoryName] = [channel.name]
  })

  return categorizedChannelsDictionary
}

const formatChannelsMessage = channelsDictionary => {
  const formattedChannelsMessage = Object.entries(channelsDictionary)
    .map(
      ([parent, channels]) =>
        `${parent}\n${channels
          .map(channel => `#${channel}`)
          .sort()
          .join('\n')}\n`
    )
    .join('\n')

  return `here's a list of joinable channels: \`\`\`ml\n${formattedChannelsMessage}\`\`\``
}

module.exports = async (subcommand, { message, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const lowerCaseSubcommand = subcommand.toLowerCase()

  if (lowerCaseSubcommand === 'list') {
    message.reply(
      formatReply(
        formatChannelsMessage(await getChannelsInCategories()),
        isDirectMessage
      )
    )
  } else
    message.reply(
      formatReply(
        `sorry, ${subcommand} is not a channel command.`,
        isDirectMessage
      )
    )
}
