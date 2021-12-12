import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { pushToChannelVisibilityQueue } from '../utils/channels.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import {
  setAdminChannel,
  setLogChannel,
  setAnnouncementChannel,
  setVerificationChannel,
  setWelcomeChannel,
  getFunctionChannels,
} from '../repositories/guilds.js'

const setCommands = {
  admin: setAdminChannel,
  log: setLogChannel,
  announcement: setAnnouncementChannel,
  verification: setVerificationChannel,
  welcome: setWelcomeChannel,
}

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol, args) {
  const guild = message.guild,
    failureMessage = `
    The \`${commandSymbol}${command}\` command requires exactly 2 parameters: \`${commandSymbol}${command} [channel function] [channel id]\` 😔\
    \nNote: \`null\` can be set in place of the channel id to remove a function from a channel, ex: \`${commandSymbol}${command} admin null\`
  `

  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )

    return
  } else if (!args) {
    message.reply(failureMessage)

    return
  }

  const argArr = args.split(' '),
    setCommandsKeys = Object.keys(setCommands),
    functionChannels = await getFunctionChannels(guild.id),
    isAlreadyFunctionChannel = Object.keys(functionChannels).find(
      key => functionChannels[key] === argArr[1]
    ),
    existingChannelFunction = isAlreadyFunctionChannel
      ? isAlreadyFunctionChannel.match(`^[a-z]+`)[0]
      : null

  if (argArr.length !== 2) {
    message.reply(failureMessage)

    return
  } else if (!setCommandsKeys.includes(argArr[0])) {
    message.reply(`${argArr[0]} is not a valid channel function. 😔`)

    return
  } else if (!guild.channels.cache.get(argArr[1]) && argArr[1] !== `null`) {
    message.reply(`${argArr[1]} is not a valid channel id. 😔`)

    return
  } else if (isAlreadyFunctionChannel) {
    message.reply(
      `<#${argArr[1]}> is already set as the ${existingChannelFunction} channel, and any given channel can only have one function 😔`
    )

    return
  }

  if (argArr[1] === `null`) {
    await setCommands[argArr[0]](guild.id, null)

    message.reply(
      `The ${argArr[0]} channel is no longer set in this server by your command 😬`
    )
  } else {
    await setCommands[argArr[0]](guild.id, argArr[1])

    pushToChannelVisibilityQueue(argArr[1])

    message.reply(
      `The <#${argArr[1]}> channel has been set as the ${argArr[0]} channel! 👍`
    )
  }
}
