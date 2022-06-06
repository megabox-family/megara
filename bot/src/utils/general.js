import { MessageActionRow, MessageButton, Constants } from 'discord.js'
import { cacheBot, getBot } from '../cache-bot.js'
import { readdirSync, existsSync } from 'fs'
import { basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isEqual } from 'lodash-es'
import { directMessageError } from '../utils/error-logging.js'
import { syncChannels } from './channels.js'
import { syncRoles, requiredRoleDifference } from './roles.js'
import { dynamicRooms } from './voice.js'
import { pushUserToQueue } from './required-role-queue.js'
import {
  syncGuilds,
  getCommandSymbol,
  getAnnouncementChannel,
  getVerificationChannel,
  getLogChannel,
  getRules,
  getNameGuidelines,
  getWelcomeChannel,
} from '../repositories/guilds.js'
import {
  removeActiveVoiceChannelId,
  getCategoryName,
  getFormatedCommandChannels,
  getChannelType,
} from '../repositories/channels.js'

const relativePath = dirname(fileURLToPath(import.meta.url)),
  srcPath = dirname(relativePath),
  textCommandFolderName = `text-commands`,
  slashCommandFolderName = `slash-commands`,
  textCommandFiles = readdirSync(`${srcPath}/${textCommandFolderName}`),
  slashCommandFiles = readdirSync(`${srcPath}/${slashCommandFolderName}`),
  textCommands = textCommandFiles.map(textCommandFile => {
    return {
      baseName: basename(textCommandFile, '.js').replace(/-/g, ``),
      fullPath: `${srcPath}/${textCommandFolderName}/${textCommandFile}`,
    }
  }),
  slashCommands = slashCommandFiles.map(slashCommandFile => {
    return {
      baseName: basename(slashCommandFile, '.js'),
      fullPath: `${srcPath}/${slashCommandFolderName}/${slashCommandFile}`,
    }
  })

export const validCommandSymbols = [
  `!`,
  `$`,
  `%`,
  `^`,
  `&`,
  `-`,
  `+`,
  `=`,
  `?`,
  `.`,
]

export async function deleteNewRoles(guild) {
  const newRole = guild.roles.cache.find(role => role.name === `new role`)

  if (!newRole) return

  await newRole.delete().catch()

  await deleteNewRoles(guild)
}

export async function registerSlashCommands(bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`)

  let commands

  if (guild) {
    commands = guild.commands
  } else {
    commands = bot.application?.commands
  }

  await commands.fetch()

  // console.log(
  //   commands.cache.forEach(command => {
  //     if (command.name === `episode`) console.log(command.options)
  //   })
  // )

  const commandCache = commands.cache,
    slashCommandNameArray = slashCommands.map(
      slashCommand => slashCommand.baseName
    )

  for (const [commandId, command] of commandCache) {
    if (!slashCommandNameArray.includes(command.name)) {
      console.log(
        `The ${command.name} command no longer exists, queued for deletion`
      )
      await command.delete()
    }
  }

  for (const slashCommand of slashCommands) {
    const commandModule = await import(slashCommand.fullPath).then(
        module => module
      ),
      commandObject = {
        name: slashCommand.baseName,
        description: commandModule?.description,
        options: commandModule?.options,
        defaultPermission: commandModule?.defaultPermission,
      },
      existingCommand = commandCache.find(
        command => command.name === slashCommand.baseName
      )

    if (commandModule?.options) commandObject.options = commandModule.options
    else commandObject.options = []

    if (commandObject.options.length > 0)
      existingCommand?.options?.forEach((option, index) => {
        const optionKeys = Object.keys(option),
          newOption = commandObject.options[index]

        optionKeys.forEach(key => {
          if (!newOption.hasOwnProperty(key)) newOption[key] = undefined
        })

        option?.choices?.forEach((choice, jndex) => {
          const choiceKeys = Object.keys(choice),
            newChoice = commandObject.options[index].choices[jndex]

          choiceKeys.forEach(key => {
            if (!newChoice.hasOwnProperty(key)) newChoice[key] = undefined
          })
        })
      })

    if (!commandModule?.description) {
      console.log(
        `'${commandObject.name}' was not registered as a slash command because it's missing core components.`
      )
    } else if (
      !existingCommand ||
      existingCommand.description !== commandObject.description ||
      !isEqual(
        existingCommand.options,
        commandObject.options ||
          existingCommand.defaultPermission !== commandObject.defaultPermission
      )
    ) {
      console.log(`${commandObject.name} was generated.`)

      if (existingCommand) await existingCommand.edit(commandObject)
      else await commands?.create(commandObject)
    }
  }
}

export async function startup(bot) {
  console.log(`Logged in as ${bot.user.tag}!`)

  cacheBot(bot)
  await syncGuilds(bot.guilds.cache)

  bot.guilds.cache.forEach(async guild => {
    await deleteNewRoles(guild)
    await syncChannels(guild)
    await syncRoles(guild)
  })

  registerSlashCommands(bot)

  // const guild = bot.guilds.cache.get(`711043006253367426`),
  //   channel = guild.channels.cache.get(`711043006781849687`)

  // console.log(channel.type)

  // console.log(guild.premiumSubscriptionCount)

  // channel.permissionOverwrites.cache.forEach(overwrite => {
  //   const individualAllowPermissions = overwrite.allow.serialize()

  //   console.log(individualAllowPermissions)
  // })
}

export async function logMessageToChannel(message) {
  const logChannelId = getLogChannel(message.guild.id)

  if (!logChannelId) return

  const currentDateTime = new Date(),
    recipientId = message.channel.recipient.id,
    guildMember = getBot().members.cache.get(recipientId)

  if (guildMember.partial) {
    try {
      await getBot().members.fetch()
    } catch (err) {
      console.log('Error fetching users: ', err)
    }
  }

  const userDisplayName = guildMember.nickname
    ? guildMember.nickname + ` (${message.channel.recipient.tag})`
    : message.channel.recipient.tag

  const messagePrefix = `**I sent the following message to ${userDisplayName} at ${currentDateTime.toISOString()}:**\n`

  getBot()
    .channels.cache.get(logChannelId)
    .send(messagePrefix + message.content)
}

export async function logErrorMessageToChannel(errorMessage, guild) {
  const logChannelId = await getLogChannel(guild.id)

  if (!logChannelId) return

  getBot().channels.cache.get(logChannelId).send(`Error: ${errorMessage}`)
}

export function removeVoiceChannelIfEmpty(voiceChannel) {
  const currentMembers = voiceChannel?.members.size

  if (!currentMembers)
    voiceChannel.delete().then(() => {
      removeActiveVoiceChannelId(voiceChannel.id)
    })
}

export async function announceNewChannel(newChannel) {
  const guild = newChannel.guild,
    announcementChannelId = await getAnnouncementChannel(guild.id)

  if (!announcementChannelId) return

  const welcomeChannelId = await getWelcomeChannel(guild.id)

  if (
    welcomeChannelId === newChannel.id ||
    [`rooms`, `unverified-rooms`].includes(newChannel.name)
  )
    return

  const channelType = await getChannelType(newChannel.id)

  if ([`category`, `hidden`, `private`, `voice`].includes(channelType)) return

  const channelNotificationSquad = guild.roles.cache.find(
      role => role.name === `channel notification squad`
    ),
    commandChannels = await getFormatedCommandChannels(
      guild.id,
      `unrestricted`
    ),
    categoryName = await getCategoryName(newChannel.parentId),
    announcementChannel = guild.channels.cache.get(announcementChannelId),
    commandSymbol = await getCommandSymbol(guild.id),
    buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!join-channel: ${newChannel.id}`)
        .setLabel(`Join ${newChannel.name}`)
        .setStyle('SUCCESS'),
      new MessageButton()
        .setCustomId(`!leave-channel: ${newChannel.id}`)
        .setLabel(`Leave ${newChannel.name}`)
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId(`!subscribe: ${channelNotificationSquad.id}`)
        .setLabel(`Subscribe to channel notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${channelNotificationSquad.id}`)
        .setLabel(`Unsubscribe from channel notifications`)
        .setStyle('SECONDARY')
    )

  let channelTypeMessage, channelTypeDetails, command

  switch (channelType) {
    case `public`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      channelTypeDetails = `By default, all members are added to public channels.`
      break
    case `joinable`:
      channelTypeMessage = `We've added a new ${channelType} channel`
      channelTypeDetails = `By default, members are not added to joinable channels.`
      break
    default:
      channelTypeMessage = `A channel has been archived`
      channelTypeDetails =
        `Messages cannot be sent in archived channels, but you can still access them to view message history. ` +
        `By default, members are not removed from archived channels unless the channel was previously public.`
  }

  if (announcementChannel)
    announcementChannel.send({
      content: `
        ${channelNotificationSquad} Hey guys! 😁\
        \n${channelTypeMessage}, **<#${newChannel.id}>**, in the **${categoryName}** category. ${channelTypeDetails} \

        \nUse the buttons below this message to join / leave **<#${newChannel.id}>** and or to manage these notifications. You can also join / leave channels using text commands, for more information use the \`${commandSymbol}help\` command in these channels: ${commandChannels}
      `,
      components: [buttonRow],
    })
}

function sendServerSubscriptionMessage(announcementChannel) {
  const guild = announcementChannel.guild,
    serverNotificationSquad = guild.roles.cache.find(
      role => role.name === `server notification squad`
    ),
    buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!subscribe: ${serverNotificationSquad.id}`)
        .setLabel(`Subscribe to server notifications`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!unsubscribe: ${serverNotificationSquad.id}`)
        .setLabel(`Unsubscribe from server notifications`)
        .setStyle('SECONDARY')
    )

  announcementChannel.send({
    components: [buttonRow],
  })
}

export async function handleMessage(message) {
  if (message.author.bot) return
  if (!message?.guild) return

  const messageText = message.content

  if (messageText.substring(0, 3) === `<@&`) {
    const channel = message.channel,
      announcementChannelId = await getAnnouncementChannel(message.guild.id)

    if (announcementChannelId === channel.id)
      sendServerSubscriptionMessage(channel)

    return
  }

  if (!validCommandSymbols.includes(messageText.substring(0, 1))) return

  const commandSymbol = await getCommandSymbol(message.guild.id)

  if (
    messageText.substring(0, 1) !== commandSymbol ||
    !messageText.substring(1, 2).match(`[0-9]|[a-zA-z]`)
  )
    return

  const delimiter = messageText.split('').find(char => {
      if ([` `, `\n`].includes(char)) return char
      else return null
    }),
    command = delimiter
      ? messageText.substring(1, messageText.indexOf(delimiter)).toLowerCase()
      : messageText.substring(1).toLowerCase(),
    args = delimiter
      ? messageText.substring(messageText.indexOf(delimiter) + 1)
      : null,
    textCommand = textCommands.find(
      textCommand => textCommand.baseName === command
    )

  if (textCommand)
    import(textCommand.fullPath).then(module =>
      module.default(message, commandSymbol, args)
    )
  else
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`${commandSymbol}help\` command to get a valid list of commands 🥰
      `
    )
}

export async function sendVerificationInstructions(guildMember) {
  const guild = guildMember.guild,
    verificationChannelId = await getVerificationChannel(guild.id),
    verificationChannel = guild.channels.cache.get(verificationChannelId),
    undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing verification`
    )?.id,
    commandSymbol = await getCommandSymbol(guild.id),
    nameGuidelines = await getNameGuidelines(guild.id)

  if (!verificationChannel || !undergoingVerificationRoleId) return

  await guildMember.roles.add(undergoingVerificationRoleId)

  if (nameGuidelines)
    verificationChannel.send(
      `\
          \n<@${guildMember.id}>\
          \nBefore I can give you full access to the server you'll need to set your nickname, don't worry it's a piece of cake! 🍰\
  
          \nFirstly, please read over ${guild.name}'s name guidelines:\
          \n${nameGuidelines}\
  
          \nLastly, set your name by using the \`/set-name\` command like this \`/set-name [your name]\`, ex: \`/set-name John\`\

          \n*Hint: if you're confused as to how this works, scroll up to see how others have been verified in this channel.*
        `
    )
  else
    verificationChannel.send(
      `\
          \n<@${guildMember.id}>\
          \nBefore I can give you full access to the server you'll need to set your nickname, don't worry it's a piece of cake! 🍰\
          \nTo set your name simply use the \`/set-name\` command like this \`/set-name [your name]\`, ex: \`/set-name John\`\

          \n*Hint: Type \`/\` to see available commands, one you start to type 'set-nick' it should come up, then entire your name in the \`name\` field.*
        `
    )
}

export async function handleNewMember(guildMember) {
  const guild = guildMember.guild,
    rules = await getRules(guild.id),
    tosButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!accept-rules: ${guildMember.guild.id}`)
        .setLabel(`Accept`)
        .setStyle('SUCCESS'),
      new MessageButton()
        .setCustomId(`!deny-rules: ${guildMember.guild.id}`)
        .setLabel(`Deny`)
        .setStyle('DANGER')
    )

  if (rules) {
    guildMember
      .send({
        content: `\
        \n👋 **You've been invited to join the ${guild.name} server!** 😄\

        \nBefore I can give you full access to the server's full functionality you'll need to accept their rules:\
        \n${rules}\

        \nDo you accept or deny their rules? Note that if you deny their rules you will be removed from their server.\

        \n*Hint: click one of the buttons below to accept or deny ${guild.name}'s rules.*
      `,
        components: [tosButtonRow],
      })
      .catch(error => directMessageError(error, guildMember))

    return
  }

  sendVerificationInstructions(guildMember)
}

export function modifyMember(oldMember, newMember) {
  const requiredRole = requiredRoleDifference(
    newMember.guild,
    oldMember._roles,
    newMember._roles
  )

  if (requiredRole)
    pushUserToQueue({
      guild: newMember.guild.id,
      role: requiredRole.name,
      user: newMember.id,
    })
}

export function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const buttonFunctionPath = `${srcPath}/button-commands/${
      interaction.customId.match(`(?!!).+(?=:)`)[0]
    }.js`

    if (existsSync(buttonFunctionPath))
      import(buttonFunctionPath).then(module => module.default(interaction))

    interaction.update({})
  } else if (interaction.isCommand()) {
    const slashCommand = slashCommands.find(
      slashCommand => slashCommand.baseName === interaction.commandName
    )

    import(slashCommand.fullPath).then(module => module.default(interaction))
  }
}

export async function handleVoiceUpdate(oldState, newState) {
  dynamicRooms(oldState, newState)
}

export function getIndividualPermissionSets(overwrite) {
  const allow = overwrite.allow.serialize(),
    deny = overwrite.deny.serialize(),
    permissionKeys = Object.keys(allow),
    permissionSets = {
      allow: new Set(),
      deny: new Set(),
    }

  permissionKeys.forEach(key => {
    if (allow[key]) permissionSets.allow.add(key)
    else if (deny[key]) {
      permissionSets.deny.add(key)
    }
  })

  return permissionSets
}

export function comparePermissions(permission) {
  if (!permission) return

  const individualAllowPermissions = permission.allow.serialize(),
    individualDenyPermissions = permission.deny.serialize(),
    permissionKeys = Object.keys(individualAllowPermissions),
    individualPermissions = {}

  permissionKeys.forEach(key => {
    if (individualAllowPermissions[key] === individualDenyPermissions[key])
      individualPermissions[key] = 1
    else individualPermissions[key] = individualAllowPermissions[key]
  })

  return individualPermissions
}
