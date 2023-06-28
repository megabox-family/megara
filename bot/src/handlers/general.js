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
  startPollTimers,
} from '../utils/general.js'
import {
  activateVoiceChannel,
  createOrActivateDynamicChannel,
  deactivateOrDeleteFirstDynamicVoiceChannel,
  deactivateOrDeleteVoiceChannel,
} from '../utils/voice.js'
import { deleteNewRoles, syncRoles } from '../utils/roles.js'
import { sortChannels, syncChannels } from '../utils/channels.js'
import { syncVipMembers } from '../utils/members.js'
import { registerSlashCommands } from '../utils/slash-commands.js'
import { registerContextCommands } from '../utils/context-commands.js'
import test from '../utils/test.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export async function startup(bot) {
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

  await startPollTimers()

  if (bot.user.username === `Omegara`) await test(bot)
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
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(
          hasChannelNotificationRole
            ? `channels & roles`
            : `manage notifications`
        )
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/customize-community`)
    )

    const parameters = {
      components: [buttonRow],
    }

    if (hasChannelNotificationRole)
      parameters.content = `You can join/leave channels or manage these notifications by clicking the button below.`

    await queueApiCall({
      apiCall: `reply`,
      djsObject: message,
      parameters,
    })
  }
}

export async function handleInteractionCreate(interaction) {
  if (interaction.isButton()) {
    const buttonFunctionPath = `${srcPath}/button-commands/${
      interaction.customId.match(`(?!!).+(?=:\\s|:$)`)[0]
    }.js`

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
      modalCommand => modalCommand.baseName === interaction.customId
    )

    import(modalCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isMessageContextMenuCommand()) {
    const contextCommand = contextCommands.find(
      contextCommand => contextCommand.baseName === interaction.commandName
    )

    import(contextCommand.fullPath).then(module => module.default(interaction))
  } else if (interaction.isStringSelectMenu()) {
    const selectCommand = selectCommands.find(
      selectCommand => selectCommand.baseName === interaction.customId
    )

    import(selectCommand.fullPath).then(module => module.default(interaction))
  }
}

export async function handleVoiceStatusUpdate(oldState, newState) {
  const { guild } = newState,
    channelId = newState.channelId ? newState.channelId : oldState.channelId,
    voiceChannel = guild.channels.cache.get(channelId),
    positionBooleanArray = []

  positionBooleanArray.push(await activateVoiceChannel(voiceChannel))
  positionBooleanArray.push(await createOrActivateDynamicChannel(voiceChannel))
  positionBooleanArray.push(await deactivateOrDeleteVoiceChannel(voiceChannel))
  positionBooleanArray.push(
    await deactivateOrDeleteFirstDynamicVoiceChannel(voiceChannel)
  )

  if (positionBooleanArray.find(boolean => boolean))
    sortChannels(guild.id, true)

  // implemented a delayed second check to make sure a new voice channel is always generated when all rooms are full
  await new Promise(resolution => setTimeout(resolution, 2000))

  const needsToBeSorted = await createOrActivateDynamicChannel(voiceChannel)

  if (needsToBeSorted) sortChannels(guild.id, true)
}
