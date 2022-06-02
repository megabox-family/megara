export default async function (interaction) {
  const guild = interaction.guild,
    channel = interaction.channel,
    user = interaction.user,
    threadId = interaction.customId.match(`(?!:)[0-9]+`)[0]

  console.log(threadId)

  let thread = guild.channels.cache.get(threadId)

  console.log(thread)

  if (!thread) {
    console.log(`made it here`)

    const archivedThreads = await interaction.channel.threads
      .fetchArchived({ fetchAll: true })
      .catch(error =>
        console.log(
          `I was unable to fetch archived threads, see error below.\n${error}`
        )
      )

    console.log(archivedThreads)

    thread = archivedThreads.threads.get(threadId)

    if (thread) await thread.setArchived(false)
  }

  if (thread) {
    await thread.members
      .add(user.id)
      .catch(error =>
        console.log(`Unable to add user to thread, see error below:\n${error}`)
      )
  } else
    user.send(
      `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`
    )
}
