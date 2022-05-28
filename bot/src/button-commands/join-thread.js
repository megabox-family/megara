export default async function (interaction) {
  const guild = interaction.guild,
    channel = interaction.channel,
    thread = guild.channels.cache.get(
      interaction.customId.match(`(?!:)[0-9]+`)[0]
    ),
    user = interaction.user

  if (thread) {
    thread.members.add(user.id)
  } else
    user.send(
      `The thread you tried joining no longer exits in the ${channel} channel within the ${guild} server.`
    )
}
