import { getBot } from '../cache-bot.js'
import { getButtonContext } from '../utils/validation.js'
import { addMemberToChannel } from '../utils/channels.js'
import { getThreadById, unarchiveThread } from '../utils/threads.js'
import { queueApiCall } from '../api-queue.js'
import { ChannelType } from 'discord.js'

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

  const { channelId, threadId } = JSON.parse(getButtonContext(customId)),
    channel = getBot().channels.cache.get(channelId),
    guild = channel.guild

  if (!channel) {
    messageObject.content = `The channel housing the thread you're tyring to join no longer exists 😬`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  const thread = await getThreadById(channel, threadId),
    { type, members } = thread

  if (!thread) {
    messageObject.content = `The thread you tried joining no longer exits 😬`

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: messageObject,
    })

    return
  }

  const member = guild.members.cache.get(user.id)

  await addMemberToChannel(member, channel.id)

  if (type === ChannelType.PrivateThread) {
    await unarchiveThread(thread)

    if (!members.cache.get(member.id))
      await queueApiCall({
        apiCall: `add`,
        djsObject: members,
        parameters: member.id,
      })
  }

  messageObject.content = `You've been granted access to **${thread}** ← click here to jump to it 😊`

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: messageObject,
  })
}
