export default function (channel, message) {
  const userCount = channel.permissionOverwrites.filter(x => {
    const userCanViewChannel = x.allow.toArray().includes('VIEW_CHANNEL')
    return userCanViewChannel && x.type === 'member'
  }).size

  const channelRows = message.content.split('\n')
  const newMessage = channelRows
    .map((row, i) => {
      if (i < 1 || !row.includes(channel.id)) return row
      let [rowContent, countText] = row.split('-')
      countText = ` **${userCount}**`
      return [rowContent, countText].join('-')
    })
    .join('\n')

  message.edit(newMessage)
}
