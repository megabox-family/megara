import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandType,
} from 'discord.js'
import { isEqual } from 'lodash-es'
import { directMessageError } from './error-logging.js'
import { slashCommands, contextCommands } from './general.js'
import { getListRoles } from './roles.js'
import { getActiveWorld } from '../repositories/guilds.js'
import { getPositionOverrides } from '../repositories/channels.js'
import {
  getWorldName,
  getWorldGroups,
  getCoordinatesByWorld,
  getCoordinatesByDimension,
  getCoordinatesByUser,
  getCoordinatesByAll,
} from '../repositories/coordinates.js'
import { getBot } from '../cache-bot.js'
import { cacheCommands } from '../cache-commands.js'
import { queueApiCall } from '../api-queue.js'
import { checkIfMemberIsPermissible } from './channels.js'

export const defaultRecordsPerPage = 20,
  dimensions = [`overworld`, `nether`, `end`]

async function registerDevCommands(guild) {
  const commands = guild.commands

  await commands.fetch()

  const commandCache = commands.cache.filter(
      command => command.type === ApplicationCommandType.ChatInput
    ),
    slashCommandNameArray = slashCommands.map(
      slashCommand => slashCommand.baseName
    )

  for (const [commandId, command] of commandCache) {
    if (!slashCommandNameArray.includes(command.name)) {
      console.log(
        `The ${command.name} command no longer exists, queued for deletion.`
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
        type: ApplicationCommandType.ChatInput,
        description: commandModule?.description,
        options: commandModule?.options,
      },
      existingCommand = commandCache.find(
        command => command.name === slashCommand.baseName
      )

    if (commandModule?.options) commandObject.options = commandModule.options
    else commandObject.options = []

    if (
      commandObject.options.length > 0 &&
      commandObject.options.length === existingCommand?.options?.length
    )
      existingCommand?.options?.forEach((option, index) => {
        const optionKeys = Object.keys(option),
          newOption = commandObject.options[index]

        optionKeys.forEach(key => {
          if (!newOption.hasOwnProperty(key)) newOption[key] = undefined
        })

        if (option.name === newOption.name)
          option?.choices?.forEach((choice, jndex) => {
            if (commandObject.options[index].choices) {
              const choiceKeys = Object.keys(choice),
                newChoice = commandObject.options[index].choices[jndex]

              choiceKeys.forEach(key => {
                if (!newChoice.hasOwnProperty(key)) newChoice[key] = undefined
              })
            }
          })
      })

    if (!commandModule?.description) {
      console.log(
        `The '${commandObject.name}' slash command was not registered because it doesn't have a description export.`
      )
    } else if (
      !existingCommand ||
      existingCommand.description !== commandObject.description ||
      !isEqual(existingCommand.options, commandObject.options)
    ) {
      if (existingCommand) {
        await existingCommand?.edit(commandObject)

        console.log(`${commandObject.name} was edited.`)
      } else {
        await commands?.create(commandObject)

        console.log(`${commandObject.name} was generated.`)
      }
    }
  }
}

async function registerProdCommands(bot) {
  const commands = bot.application?.commands

  await commands.fetch()

  const commandCache = commands.cache.filter(
      command => command.type === ApplicationCommandType.ChatInput
    ),
    commandsArray = []

  let updateCommands = false

  for (const slashCommand of slashCommands) {
    const commandModule = await import(slashCommand.fullPath).then(
        module => module
      ),
      commandObject = {
        name: slashCommand.baseName,
        type: ApplicationCommandType.ChatInput,
        description: commandModule?.description,
        options: commandModule?.options,
        dmPermission: commandModule?.dmPermission,
        defaultMemberPermissions: commandModule?.defaultMemberPermissions,
      },
      existingCommand = commandCache.find(
        command => command.name === slashCommand.baseName
      )

    if (commandModule?.options) commandObject.options = commandModule.options
    else commandObject.options = []

    if (
      commandObject.options.length > 0 &&
      commandObject.options.length === existingCommand?.options?.length
    )
      existingCommand?.options?.forEach((option, index) => {
        const optionKeys = Object.keys(option),
          newOption = commandObject.options[index]

        optionKeys.forEach(key => {
          if (!newOption.hasOwnProperty(key)) newOption[key] = undefined
        })

        if (option.name === newOption.name)
          option?.choices?.forEach((choice, jndex) => {
            if (commandObject.options[index].choices) {
              const choiceKeys = Object.keys(choice),
                newChoice = commandObject.options[index].choices[jndex]

              if (newChoice) {
                choiceKeys.forEach(key => {
                  if (!newChoice?.hasOwnProperty(key))
                    newChoice[key] = undefined
                })
              }
            }
          })
      })

    commandsArray.push(commandObject)

    if (
      !existingCommand ||
      existingCommand.description !== commandObject.description ||
      !isEqual(existingCommand.options, commandObject.options) ||
      existingCommand.dmPermission !== commandObject.dmPermission
    )
      updateCommands = true
  }

  // console.log(commandsArray)

  // if (updateCommands) {
  console.log(`New slash commands were generated`)

  cacheCommands(commandsArray)
  // }
}

export async function registerSlashCommands(bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`)

  if (guild) {
    await registerDevCommands(guild)
  } else {
    await registerProdCommands(bot)
  }
}

export async function getPages(recordsPerPage, groupBy, guild, filters) {
  let query, activeWorldName

  switch (groupBy) {
    case `position-overrides`:
      query = await getPositionOverrides(guild.id)
      break
    case `coordinates-world`:
      query = await getCoordinatesByWorld(guild.id, filters)
      break
    case `coordinates-dimension`:
      query = await getCoordinatesByDimension(guild.id, filters)
      break
    case `coordinates-user`:
      query = await getCoordinatesByUser(guild, filters)
      break
    case `coordinates-all`:
      query = await getCoordinatesByAll(guild.id, filters)
      break
    case `worlds-world`:
      query = await getWorldGroups(guild.id, filters)
      const activeWorldId = await getActiveWorld(guild.id)
      activeWorldName = await getWorldName(activeWorldId)
      break
  }

  if (query.length === 0) return

  if (activeWorldName)
    query.forEach(record => {
      if (record.values === activeWorldName)
        record.values = `**${activeWorldName} (active world)**`
    })

  const groups = [...new Set(query.map(record => record.group))],
    groupedValues = groups.map(groupValue => {
      return query
        .filter(record => record.group === groupValue)
        .map(record => record.values)
    }),
    formattedBuckets = []

  let counter = 0,
    subPage = 1,
    subPageTotal = 0

  for (let i = 0; i < groups.length; i++) {
    const groupValue = groups[i]

    if (counter === recordsPerPage) counter = 0

    if (counter === 0) {
      formattedBuckets.push([])
    }

    counter++

    if (counter === recordsPerPage) {
      i--

      continue
    }

    const page = formattedBuckets.length - 1,
      groupValues = groupedValues[i],
      _groupValues = []

    while (groupValues.length !== 0) {
      if (counter === recordsPerPage) break

      _groupValues.push(groupValues.shift())

      counter++
    }

    if (groupValues.length !== 0) {
      subPageTotal = Math.ceil(groupValues.length / recordsPerPage) + subPage

      formattedBuckets[page].push({
        name: `${groupValue} ⋅ ${subPage} of ${subPageTotal}`,
        value: _groupValues.join(`\n`),
      })

      subPage++
      i--
    } else if (subPage === subPageTotal) {
      formattedBuckets[page].push({
        name: `${groupValue} ⋅ ${subPage} of ${subPageTotal}`,
        value: _groupValues.join(`\n`),
      })

      subPage = 1
      subPageTotal = 0
    } else {
      formattedBuckets[page].push({
        name: groupValue,
        value: _groupValues.join(`\n`),
      })
    }
  }

  return formattedBuckets
}

export async function generateListMessage(
  pages,
  title,
  description,
  color = `#0099ff`,
  defaultPage = 1
) {
  const totalPages = pages.length,
    disableBack = defaultPage === 1 ? true : false,
    disableForward = defaultPage === totalPages ? true : false,
    listButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!change-page: first`)
        .setLabel(`«`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disableBack),
      new ButtonBuilder()
        .setCustomId(`!change-page: -1`)
        .setLabel(`‹`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disableBack),
      new ButtonBuilder()
        .setCustomId(`!refresh-embed:`)
        .setLabel(`⟳`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`!change-page: 1`)
        .setLabel(`›`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disableForward),
      new ButtonBuilder()
        .setCustomId(`!change-page: last`)
        .setLabel(`»`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disableForward)
    )

  const listEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(pages[defaultPage - 1])
    .setFooter({ text: `Page ${defaultPage} of ${totalPages}` })
    .setTimestamp()

  if (description) listEmbed.setDescription(description)

  return {
    embeds: [listEmbed],
    components: [listButtons],
    ephemeral: true,
  }
}

export async function handleVoiceChannel(channel, invitedMember, interaction) {
  const { guild, name: channelName } = channel,
    { member } = interaction,
    memberIsPermissible = checkIfMemberIsPermissible(channel, invitedMember)

  let messageContent = `${member}`

  if (memberIsPermissible === true) {
    messageContent += ` has invited you to ${channel} ← click here to jump to it 😊`

    await queueApiCall({
      apiCall: `send`,
      djsObject: invitedMember,
      parameters: messageContent,
    })
  } else {
    const joinChannelButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!join-voice-channel: ${channel.id}`)
        .setLabel(`Join ${channelName}`)
        .setStyle(ButtonStyle.Primary)
    )

    messageContent +=
      ` from **${guild}** has invited you to the **${channelName}** voice channel 🙌` +
      `\n\nHowever, you don't currently have access. Press the button below to gain access.`

    await queueApiCall({
      apiCall: `send`,
      djsObject: invitedMember,
      parameters: {
        content: messageContent,
        components: [joinChannelButton],
      },
    })
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
  })
}

export function getCommandByName($commandName, guildId) {
  const bot = getBot(),
    guild = bot.guilds.cache.get(guildId),
    botName = bot.user.username,
    commands = bot.application?.commands?.cache,
    command = commands.find(command => command.name === $commandName)

  return command
}
