export default async function (interaction) {
  const guild = interaction.guild,
    channel = interaction.channel,
    user = interaction.user,
    threadId = interaction.customId.match(`(?!:)[0-9]+`)[0]

  let thread = guild.channels.cache.get(threadId)

  if (!thread) {
    const archivedPrivateThreads = await interaction.channel.threads
      .fetchArchived({ type: `private`, fetchAll: true })
      .catch(error =>
        console.log(
          `I was unable to fetch archived private threads, see error below.\n${error}`
        )
      )

    const archivedPublicThreads = await interaction.channel.threads
      .fetchArchived({ type: `public`, fetchAll: true })
      .catch(error =>
        console.log(
          `I was unable to fetch archived public threads, see error below.\n${error}`
        )
      )

    const privateThread = archivedPrivateThreads.threads.get(threadId),
      publicThread = archivedPublicThreads.threads.get(threadId)

    thread = privateThread ? privateThread : publicThread

    if (thread) await thread.setArchived(false)
  }

  if (thread) {
    await thread.members
      .add(user.id)
      .catch(error =>
        console.log(`Unable to add user to thread, see error below:\n${error}`)
      )
  } else
    user
      .send(
        `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`
      )
      .catch(error =>
        console.log(`Couldn't send user messsage (thread button):\n${error}`)
      )
}
