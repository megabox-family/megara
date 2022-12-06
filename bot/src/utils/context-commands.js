import { ApplicationCommandType } from 'discord.js'
import { contextCommands } from './general.js'
import { cacheCommands } from '../cache-commands.js'

async function registerDevContextCommands(guild) {
  const commands = guild.commands

  const contextTypeArray = [
      ApplicationCommandType.User,
      ApplicationCommandType.Message,
    ],
    contextCommandCache = commands.cache.filter(command =>
      contextTypeArray.includes(command.type)
    ),
    contextCommandNameArray = contextCommands.map(
      contextCommand => contextCommand.baseName
    )

  for (const [contextCommandId, contextCommand] of contextCommandCache) {
    if (!contextCommandNameArray.includes(contextCommand.name)) {
      console.log(
        `The '${contextCommand.name}' command no longer exists, queued for deletion.`
      )

      await contextCommand.delete()
    }
  }

  for (const contextCommand of contextCommands) {
    const contextCommandModule = await import(contextCommand.fullPath).then(
        module => module
      ),
      contextCommandObject = {
        name: contextCommand.baseName,
        type: contextCommandModule.type,
      },
      existingContextCommand = contextCommandCache.find(
        existingContextCommand =>
          existingContextCommand.name === contextCommand.baseName
      )

    if (!contextCommandObject?.type)
      console.log(
        `The '${contextCommandObject.name}' context menu command was not registered as it's missing a type export.`
      )
    if (contextCommandObject?.type !== existingContextCommand?.type) {
      console.log(`${contextCommandObject.name} was generated.`)

      await existingContextCommand?.delete()
      await commands?.create(contextCommandObject)
    }
  }
}

async function registerProdContextCommands(bot) {
  const commands = bot.application?.commands,
    contextTypeArray = [
      ApplicationCommandType.User,
      ApplicationCommandType.Message,
    ],
    contextCommandCache = commands.cache.filter(command =>
      contextTypeArray.includes(command.type)
    ),
    contextCommandArray = []

  let updateContextCommands = false

  for (const contextCommand of contextCommands) {
    const contextCommandModule = await import(contextCommand.fullPath).then(
        module => module
      ),
      contextCommandObject = {
        name: contextCommand.baseName,
        type: contextCommandModule.type,
      },
      existingContextCommand = contextCommandCache.find(
        existingContextCommand =>
          existingContextCommand.name === contextCommand.baseName
      )

    contextCommandArray.push(contextCommandObject)

    if (contextCommandObject?.type !== existingContextCommand?.type) {
      updateContextCommands = true
    }
  }

  // if (updateContextCommands) {
  console.log(`New context commands were generated`)

  cacheCommands(contextCommandArray)
  // }
}

export async function registerContextCommands(bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`)

  if (guild) {
    await registerDevContextCommands(guild)
  } else {
    await registerProdContextCommands(bot)
  }
}
