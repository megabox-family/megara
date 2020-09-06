const { getJoinableChannels } = require('../repositories/channels')

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

module.exports = async (subcommand, { message }) => {
  const lowerCaseSubcommand = subcommand.toLowerCase()

  if (lowerCaseSubcommand === 'list') {
    message.reply(formatChannelsMessage(await getChannelsInCategories()))
  } else message.reply(`sorry, ${subcommand} is not a channel command.`)
}
