import { getBot } from '../cache-bot.js'
import { addMemberToChannel } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'
import { getButtonContext } from '../utils/validation.js'

export default async function (interaction) {
  const { _guild, user, customId } = interaction,
    isDm = _guild ? false : true,
    messageObject = {}

  if (isDm) {
    await queueApiCall({
      apiCall: `deferUpdate`,
      djsObject: interaction,
    })

    messageObject.components = []
  } else {
    await queueApiCall({
      apiCall: `deferReply`,
      djsObject: interaction,
      parameters: { ephemeral: true },
    })
  }

  const channelId = getButtonContext(customId),
    channel = getBot().channels.cache.get(channelId)

  if (!channel) {
    messageObject.content = `The channel you tried joining no longer exists 😬`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  const { id, name, guild } = channel,
    member = guild.members.cache.get(user.id),
    result = await addMemberToChannel(member, id)

  if (result === false) {
    messageObject.content = `I had a problem adding you to **${name}**, please contact an administrator 😬`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  messageObject.content = `You've been granted access to **${channel}** ← click here to jump to it 😊`

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageObject,
  })
}
