import { getBot } from '../cache-bot.js'
import { getButtonContext } from '../utils/validation.js'
import { addMemberToChannel } from '../utils/channels.js'
import { getThreadById, unarchiveThread } from '../utils/threads.js'

export default async function (interaction) {
  await interaction.deferReply()

  const context = JSON.parse(getButtonContext(interaction.customId)),
    channel = getBot().channels.cache.get(context.channel),
    guild = channel.guild

  if (!channel) {
    await interaction.editReply({
      content: `The channel housing the thread you're tyring to join no longer exists within the ${guild} server 😬`,
    })

    return
  }

  const threadId = context.thread,
    thread = await getThreadById(channel, threadId)

  if (!thread) {
    await interaction.editReply({
      content: `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server 😬`,
    })

    return
  }

  const member = guild.members.cache.get(interaction.user.id)

  await addMemberToChannel(member, channel.id)
  await unarchiveThread(thread)

  if (!thread.members.cache.get(member.id))
    await thread.members
      .add(member.id)
      .catch(error =>
        console.log(`Unable to add user to thread, see error below:\n${error}`)
      )

  const category = guild.channels.cache.get(channel.parentId),
    categoryContext = category ? ` in the **${category.name}** category` : ``

  await interaction.editReply({
    content: `
      You've been added to the **${thread}** thread in the **${channel}** channel${categoryContext} within the **${guild.name}** server 🙌\
      \nYou can jump to this thread from this message by clicking here → **${thread}**
    `,
  })
}
