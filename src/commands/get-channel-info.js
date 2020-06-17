const { getJoinableChannels } = require('../repositories/channels')

const getChannelsInCategories = (message) => {
  const channelNames = Object.keys(joinableChannels)
  let categorizedChannelsDictionary = {}

  channelNames.forEach((channelName) => {
    const parentName = message.guild.channels.get(
      message.guild.channels.get(joinableChannels[channelName]).parentID
    ).name
    if (categorizedChannelsDictionary[parentName])
      categorizedChannelsDictionary[parentName].push(channelName)
    else categorizedChannelsDictionary[parentName] = [channelName]
  })

  return categorizedChannelsDictionary
}

const formatChannelsMessage = (channelsDictionary) => {
  const formattedChannelsMessage = Object.entries(channelsDictionary)
    .map(
      ([parent, channels]) =>
        `${parent}\n${channels
          .map((channel) => `#${channel}`)
          .sort()
          .join('\n')}\n`
    )
    .join('\n')

  return `here's a list of joinable channels: \`\`\`ml\n${formattedChannelsMessage}\`\`\``
}

module.exports = (subcommand, message) => {
  const lowerCaseSubcommand = subcommand.toLowerCase()

  if (lowerCaseSubcommand === 'list') {
    message.reply(formatChannelsMessage(getChannelsInCategories(message)))
  } else message.reply(`sorry, ${subcommand} is not a channel command.`)
}
