import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `unrestricted`
    )

    message.reply(
      `
          Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔\
          \nBut here's a list of channels you can use it in: ${commandChannels}
        `
    )

    return
  }

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
    message.reply(`Your wish is my command 🪄`)

    return
  }

  const guild = message.guild,
    colors = guild.roles.cache
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
