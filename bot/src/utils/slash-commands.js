export async function registerSlashCommands(bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`) //test server, only accessible in development.
  // const guild = null

  let commands

  if (guild) {
    commands = guild.commands
  } else {
    commands = bot.application?.commands
  }

  await commands.fetch()

  // commands.cache.find(command => command.name === `voice`).delete()

  if (!commands.cache.find(command => command.name === `voice`))
    await commands?.create({
      name: `voice`,
      description: `Opens a voice channel in relation to the current text channel.`,
    })
}
