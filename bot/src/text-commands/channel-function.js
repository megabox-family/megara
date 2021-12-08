import { getBot } from '../cache-bot.js'
import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import {
  setAdminChannel,
  setLogChannel,
  setAnnouncementChannel,
  setVerificationChannel,
} from '../repositories/guilds.js'

const setCommands = {
  admin: setAdminChannel,
  log: setLogChannel,
  announcement: setAnnouncementChannel,
  verification: setVerificationChannel,
}

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) return

  const argArr = args.split(' ')

  if (argArr.length !== 2) {
    message.reply(
      `The \`${commandSymbol}${command}\` command requires exactly 2 parameters: \`${commandSymbol}${command} [channel function] [channel id]\` 😔`
    )
    return
  } else if (
    !['admin', 'log', 'announcement', 'verification'].includes(argArr[0])
  ) {
    message.reply(`${argArr[0]} is not a valid channel function. 😔`)
    return
  } else if (!message.guild.channels.cache.get(argArr[1])) {
    message.reply(`${argArr[1]} is not a valid channel id. 😔`)
    return
  }

  await setCommands[argArr[0]](message.guild.id, argArr[1])

  message.reply(
    `The <#${argArr[1]}> channel has been set as the ${argArr[0]} channel! 👍`
  )
}
