export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    roleId = interaction.customId.match(`(?!:)[0-9]+`)[0],
    role = guild.roles.cache.get(roleId)

  let roleName

  switch (role.name) {
    case `server notification squad`:
      roleName = `server`
      break
    case `channel notification squad`:
      roleName = `channel`
      break
    default:
      roleName = `color`
  }

  member.roles.remove(roleId)

  interaction.reply({
    content: `You are now unsubscribed from ${roleName} notifications in the ${guild.name} server.`,
    ephemeral: true,
  })
}
