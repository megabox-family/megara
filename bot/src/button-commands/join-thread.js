import { getThreadById, unarchiveThread } from '../utils/threads.js'

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    channel = interaction.channel,
    user = interaction.user,
    threadId = interaction.customId.match(`(?!:)[0-9]+`)[0]

  const thread = await getThreadById(channel, threadId)

  if (thread) {
    await unarchiveThread(thread)

    await thread.members
      .add(user.id)
      .then(await interaction.editReply(`You've been added to ${thread} 👍`))
      .catch(async error => {
        await interaction.editReply(
          `There was a problem adding you to the thread, please contact an administrator 😬`
        )

        console.log(`Unable to add user to thread, see error below:\n${error}`)
      })
  } else
    await interaction.editReply({
      content: `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`,
    })
}

//test
