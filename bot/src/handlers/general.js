import { existsSync } from 'fs'
import { queueApiCall } from '../api-queue.js'
import { cacheBot } from '../cache-bot.js'
import { getCommands } from '../cache-commands.js'
import {
  getChannelNotificationsRoleId,
  syncGuilds,
} from '../repositories/guilds.js'
import { getPollStartTime } from '../repositories/polls.js'
import {
  contextCommands,
  getNotificationRoles,
  modalCommands,
  selectCommands,
  slashCommands,
  srcPath,
  startEventTimers,
  startPollTimers,
} from '../utils/general.js'
import {
  activateVoiceChannel,
  createOrActivateDynamicChannel,
  deactivateOrDeleteFirstDynamicVoiceChannel,
  deactivateOrDeleteVoiceChannel,
} from '../utils/voice.js'
import { deleteNewRoles, syncRoles } from '../utils/roles.js'
import { pushToChannelSortingQueue, syncChannels } from '../utils/channels.js'
import { syncVipMembers } from '../utils/members.js'
import { registerSlashCommands } from '../utils/slash-commands.js'
import { registerContextCommands } from '../utils/context-commands.js'
import test from '../utils/test.js'
import { addVoiceMemberToParentThread } from '../utils/threads.js'
import { getChannelCustomFunction } from '../repositories/channels.js'
import { getInteractionCommandName } from '../utils/validation.js'

export const twelveHours = 43200000,
  twentyFourHours = 86400000

async function startTimers() {
  startPollTimers()
  startEventTimers()

  await new Promise(resolution => setTimeout(resolution, twelveHours))

  startTimers()
}

export async function handleReady(bot) {
  console.log(`logged in as ${bot.user.tag} 😈`)
  console.log(`nodejs version - ${process.version}`)

  cacheBot(bot)
  await syncGuilds(bot.guilds.cache)

  bot.guilds.cache.forEach(async guild => {
    await deleteNewRoles(guild)
    await syncChannels(guild)
    await syncRoles(guild)
    await syncVipMembers(guild)
  })

  await registerSlashCommands(bot)
  await registerContextCommands(bot)

  const commands = getCommands()

  if (commands) {
    bot.application?.commands.set(commands)
  }

  startTimers()

  if (bot.user.username !== `megara`) await test(bot)
}

export async function handleMessageCreate(message) {
  const { guild } = message

  if (!guild) return

  let pollResults = false

  if (message.author.id === message.client.user.id) {
    const isPollReply = await getPollStartTime(message.reference?.messageId)

    if (isPollReply) pollResults = true
  }

  if (
    message.author.id === message.client.user.id &&
    message?.interaction?.commandName !== `poll` &&
    !pollResults
  )
    return

  const notificationRoles = getNotificationRoles(message)

  if (!notificationRoles) return

  const channelNotificationsRoleId = await getChannelNotificationsRoleId(
      guild.id
    ),
    hasChannelNotificationRole = notificationRoles.has(
      channelNotificationsRoleId
    )

  if (notificationRoles) {
    let messageContent = `- manage notifications → <id:customize>`

    messageContent += hasChannelNotificationRole
      ? `\n- manage channel list → <id:browse>`
      : ``

    await queueApiCall({
      apiCall: `reply`,
      djsObject: message,
      parameters: messageContent,
    })
  }
}

export async function handleInteractionCreate(interaction) {
  const { customId } = interaction,
    _commandName = getInteractionCommandName(customId),
    commandName = _commandName ? _commandName : customId

  if (interaction.isButton()) {
    const buttonFunctionPath = `${srcPath}/button-commands/${commandName}.js`

    if (existsSync(buttonFunctionPath))
      await import(buttonFunctionPath).then(module =>
        module.default(interaction)
      )

    interaction.update({}).catch(error => {
      if (
        ![
          `The reply to this interaction has already been sent or deferred.`,
          `Interaction has already been acknowledged.`,
        ].includes(error.message)
      )
        console.log(error.message)
    })
  } else if (interaction.isChatInputCommand()) {
    const slashCommand = slashCommands.find(
      slashCommand => slashCommand.baseName === interaction.commandName
    )

    import(slashCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isModalSubmit()) {
    const modalCommand = modalCommands.find(
      modalCommand => modalCommand.baseName === commandName
    )

    import(modalCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isMessageContextMenuCommand()) {
    const contextCommand = contextCommands.find(
      contextCommand => contextCommand.baseName === interaction.commandName
    )

    import(contextCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isStringSelectMenu()) {
    const selectCommand = selectCommands.find(
      selectCommand => selectCommand.baseName === customId
    )

    import(selectCommand.fullPath).then(module => module.default(interaction))
  }
}

export async function handleDisconnect(voiceChannel) {
  if (!voiceChannel) return

  const { guild } = voiceChannel,
    positionBooleanArray = []

  positionBooleanArray.push(await deactivateOrDeleteVoiceChannel(voiceChannel))
  positionBooleanArray.push(
    await deactivateOrDeleteFirstDynamicVoiceChannel(voiceChannel)
  )

  if (positionBooleanArray.find(boolean => boolean))
    pushToChannelSortingQueue({ guildId: guild.id, bypassComparison: true })
}

export async function handleConnect(voiceChannel, member) {
  if (!voiceChannel) return

  const { guild } = voiceChannel,
    positionBooleanArray = []

  positionBooleanArray.push(await activateVoiceChannel(voiceChannel))
  positionBooleanArray.push(await createOrActivateDynamicChannel(voiceChannel))

  await addVoiceMemberToParentThread(voiceChannel, member)

  if (positionBooleanArray.find(boolean => boolean))
    pushToChannelSortingQueue({ guildId: guild.id, bypassComparison: true })

  await new Promise(resolution => setTimeout(resolution, 2000))

  const needsToBeSorted = await createOrActivateDynamicChannel(voiceChannel)

  if (needsToBeSorted)
    pushToChannelSortingQueue({
      guildId: guild.id,
      bypassComparison: true,
    })
}

export async function handleVoiceStatusUpdate(oldState, newState) {
  const { channelId: oldChannelId } = oldState,
    { channelId: newChannelId, guild, member } = newState

  if (oldChannelId === newChannelId) return

  const oldVoiceChannel = guild.channels.cache.get(oldChannelId),
    newVoiceChannel = guild.channels.cache.get(newChannelId),
    oldChannelCustomFunction = await getChannelCustomFunction(oldChannelId),
    newChannelCustomFunction = await getChannelCustomFunction(newChannelId)

  if (oldChannelCustomFunction === `voice`) handleDisconnect(oldVoiceChannel)

  if (newChannelCustomFunction === `voice`)
    handleConnect(newVoiceChannel, member)
}
