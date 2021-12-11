import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import {
  setCommandSymbol,
  getAnnouncementChannel,
} from '../repositories/guilds.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )

    return
  }

  const guild = message.guild,
    validCommandSymbols = [
      `!`,
      `$`,
      `%`,
      `^`,
      `&`,
      `(`,
      `)`,
      `-`,
      `+`,
      `=`,
      `{`,
      `}`,
      `[`,
      `]`,
      `?`,
      `,`,
      `.`,
    ],
    commandSymbolsString = validCommandSymbols.join('`, `')

  if (!validCommandSymbols.includes(args)) {
    message.reply(
      `\
        \n${args} is not a valid command symbol 🤔\
        \nHere's a list of valid command symbols: \`${commandSymbolsString}\` (not including comma)
      `
    )

    return
  }

  await setCommandSymbol(guild.id, args)

  message.reply(`\`${args}\` has been set as the new command symbol!`)

  const announcementChannelId = await getAnnouncementChannel(guild.id),
    announcementChannel = guild.channels.cache.get(announcementChannelId)

  announcementChannel.send(
    `\
      \n@everyone\
      \nThe command symbol for my commands in this server has been changed to \`${args}\` 🤗
      \nThis means that all my commands will now start with \`${args}\`, ex: \`${args}roll 1d6\`
    `
  )
}
