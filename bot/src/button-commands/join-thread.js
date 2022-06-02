export default async function (interaction) {
  const guild = interaction.guild,
    channel = interaction.channel,
    thread = guild.channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    user = interaction.user

  console.log(thread)

  if (thread) {
    if (thread.archived) await thread.setArchived(false)

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
