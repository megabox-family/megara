import { getThreadById, unarchiveThread } from '../utils/threads.js'

export default async function (interaction) {
  const guild = interaction.guild,
    channel = interaction.channel,
    user = interaction.user,
    threadId = interaction.customId.match(`(?!:)[0-9]+`)[0]

  const thread = await getThreadById(channel, threadId)

  if (thread) {
    await unarchiveThread(thread)

    await thread.members
      .add(user.id)
      .catch(error =>
        console.log(`Unable to add user to thread, see error below:\n${error}`)
      )
  } else
    interaction.reply({
      content: `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`,
      ephemeral: true,
    })
}
