import { readdirSync, existsSync } from 'fs'
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
  deactivateOrDeleteDynamicVoiceChannels,
  deactivateOrDeleteVoiceChannel,
} from '../utils/voice.js'
import { deleteNewRoles, syncRoles } from '../utils/roles.js'
import { syncChannels } from '../utils/channels.js'
import { syncVipMembers } from '../utils/members.js'
import { registerSlashCommands } from '../utils/slash-commands.js'
import { registerContextCommands } from '../utils/context-commands.js'

export async function startup(bot) {
  console.log(`Logged in as ${bot.user.tag}!`)
  console.log(process.version)

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

  // const guild = bot.guilds.cache.get(`1100538270263291904`),
  //   activeVoiceCategory = bot.channels.cache.get(`1100552765228458034`),
  //   inactiveVoiceCategory = bot.channels.cache.get(`1100552826280742993`),
  //   room1 = guild.channels.cache.get(`1121985276923875370`),
  //   room2 = guild.channels.cache.get(`1122640725562097715`),
  //   room3 = guild.channels.cache.get(`1122641250324062208`),
  //   afk = guild.channels.cache.get(`1100560364569104516`)

  // console.log(room1.rawPosition, room1.position)
  // console.log(room2.rawPosition, room2.position)
  // console.log(room3.rawPosition, room3.position)
  // console.log(afk.rawPosition, afk.position)

  // await room2.setParent(activeVoiceCategory.id, { lockPermissions: true })
  // await room3.setParent(activeVoiceCategory.id, { lockPermissions: true })

  // console.log(room1.rawPosition, room1.position)
  // console.log(room2.rawPosition, room2.position)
  // console.log(room3.rawPosition, room3.position)
  // console.log(afk.rawPosition, afk.position)
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
    channelId = oldState.channelId ? oldState.channelId : newState.channelId,
    voiceChannel = guild.channels.cache.get(channelId)

  await activateVoiceChannel(voiceChannel)
  await createOrActivateDynamicChannel(voiceChannel)
  await deactivateOrDeleteVoiceChannel(voiceChannel)
  await deactivateOrDeleteDynamicVoiceChannels(voiceChannel)
}
