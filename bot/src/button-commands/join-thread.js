import { queueApiCall } from '../api-queue.js'
import { getThreadById, unarchiveThread } from '../utils/threads.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const guild = interaction.guild,
    channel = interaction.channel,
    user = interaction.user,
    threadId = interaction.customId.match(`(?!:)[0-9]+`)[0]

  const thread = await getThreadById(channel, threadId)

  if (thread) {
    await unarchiveThread(thread)

    await queueApiCall({
      apiCall: `add`,
      djsObject: thread.members,
      parameters: user.id,
    })
      .then(
        await queueApiCall({
          apiCall: `editReply`,
          djsObject: interaction,
          parameters: `You've been added to ${thread} ← click here to jump to it 👍`,
        })
      )
      .catch(async error => {
        await queueApiCall({
          apiCall: `editReply`,
          djsObject: interaction,
          parameters: `There was a problem adding you to the thread, please contact an administrator 😬`,
        })

        console.log(`Unable to add user to thread, see error below:\n${error}`)
      })
  } else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`,
    })
}
