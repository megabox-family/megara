import { MessageEmbed, MessageActionRow, MessageButton } from 'discord.js'
import { isEqual } from 'lodash-es'
import { slashCommands } from './general.js'
import { getColorRoles } from './roles.js'
import { getActiveWorld } from '../repositories/guilds.js'
import {
  getJoinableChannelList,
  getPublicChannelList,
  getArchivedChannelList,
} from '../repositories/channels.js'
import {
  getWorldName,
  getWorldGroups,
  getCoordinatesByWorld,
  getCoordinatesByDimension,
  getCoordinatesByUser,
  getCoordinatesByAll,
} from '../repositories/coordinates.js'

export const defaultRecordsPerPage = 20,
  dimensions = [`overworld`, `nether`, `end`]

async function registerDevCommands(guild) {
  const commands = guild.commands

  await commands.fetch()

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
        `'${commandObject.name}' was not registered as a slash command because it's missing core components.`
      )
    } else if (
      !existingCommand ||
      existingCommand.description !== commandObject.description ||
      !isEqual(existingCommand.options, commandObject.options) ||
      existingCommand.defaultPermission !== commandObject.defaultPermission
    ) {
      console.log(`${commandObject.name} was generated.`)

      if (existingCommand) await existingCommand.edit(commandObject)
      else await commands?.create(commandObject)
    }
  }
}

async function registerProdCommands(bot) {
  const commands = bot.application?.commands

  await commands.fetch()

  const commandCache = commands.cache,
    commandsArray = []

  let updateCommands = false

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

    commandsArray.push(commandObject)

    if (
      !existingCommand ||
      existingCommand.description !== commandObject.description ||
      !isEqual(existingCommand.options, commandObject.options) ||
      existingCommand.defaultPermission !== commandObject.defaultPermission
    )
      updateCommands = true
  }

  if (updateCommands) {
    console.log(`New commands were generated`)

    commands.set(commandsArray)
  }
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
    case `roles-color`:
      query = getColorRoles(guild)
      break
    case `channels-joinable`:
      query = await getJoinableChannelList(guild.id)
      break
    case `channels-public`:
      query = await getPublicChannelList(guild.id)
      break
    case `channels-archived`:
      query = await getArchivedChannelList(guild.id)
      break
  }

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

export async function generateListMessage(pages, title, description) {
  description = description ? `${description} \n` : ``

  const totalPages = pages.length,
    onlyOnePage = totalPages === 1 ? true : false,
    listButtons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!change-page: first`)
        .setLabel(`«`)
        .setStyle('PRIMARY')
        .setDisabled(true),
      new MessageButton()
        .setCustomId(`!change-page: -1`)
        .setLabel(`‹`)
        .setStyle('PRIMARY')
        .setDisabled(true),
      new MessageButton()
        .setCustomId(`!refresh-embed:`)
        .setLabel(`⟳`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!change-page: 1`)
        .setLabel(`›`)
        .setStyle('PRIMARY')
        .setDisabled(onlyOnePage),
      new MessageButton()
        .setCustomId(`!change-page: last`)
        .setLabel(`»`)
        .setStyle('PRIMARY')
        .setDisabled(onlyOnePage)
    )

  const listEmbed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(title)
    .setDescription(`${description}──────────────────────────────`)
    .addFields(pages[0])
    .setFooter({ text: `Page 1 of ${totalPages}` })
    .setTimestamp()

  return {
    embeds: [listEmbed],
    components: [listButtons],
    ephemeral: true,
  }
}
