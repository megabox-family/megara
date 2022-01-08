import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  const guild = message.guild

  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  if (args === null) {
    message.reply(
      `\
        \nThe \`${commandSymbol}${command}\` command requires a color 🤔\
        \nFor example: \`${commandSymbol}${command} sobble\`
        \nUse \`${commandSymbol}${command} list\` to get a list of valid colors.
      `
    )

    return
  }

  if (args === `list`) {
    message.channel.send({
      content: `Your wish is my command 🪄`,
      files: [`/app/src/media/${guild.id}.png`],
    })

    return
  }

  const colors = guild.roles.cache
      .filter(role => role.name.match(`^~.+~$`))
      .map(role => {
        return {
          name: role.name.match(`(?!~).+(?=~)`)[0].toLowerCase(),
          id: role.id,
        }
      }),
    color = colors.find(color => color.name === args.toLowerCase())

  if (color) {
    const guildMember = guild.members.cache.get(message.author.id)

    await guildMember.roles.add(color.id)

    guildMember.roles.cache.forEach(role => {
      if (role.name.match(`^~.+~$`) && role.id !== color.id)
        guildMember.roles.remove(role.id)
    })

    message.reply(`Your color has been set to \`${args}\` 🤗`)
  } else
    message.reply(
      `\
        \n\`${args}\` is not a valid color 🤔\
        \nUse \`${commandSymbol}${command} list\` to get a list of valid colors.
      `
    )
}
