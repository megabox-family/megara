import { ApplicationCommandOptionType } from 'discord.js'
import { checkIfChannelIsSuggestedType } from '../utils/channels.js'
import {
  createVoiceCommandChannel,
  deactivateOrDeleteVoiceChannel,
  delayedDeactivateOrDelete,
} from '../utils/voice.js'
import {
  getChannelCustomFunction,
  setCreateMessageContext,
} from '../repositories/channels.js'
import { queueApiCall } from '../api-queue.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
  setActiveVoiceCategoryId,
  setInactiveVoiceCategoryId,
} from '../repositories/guilds.js'

export const description = `Creates a new voice channel with variable functionality.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `name`,
      description: `The name of the voice channel you're creating (defaults to the name of the channel you're in).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `dynamic`,
      description: `Choose if the voice channel dynamically expands (default true if channel, false if thread).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `temporary`,
      description: `Channel will delete itself after the last person leaves (default false if channel, true if thread).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `disable-chat`,
      description: `If true chat linked to voice channel is disabled (default false if channel, true if thread).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `always-active`,
      description: `Choose if the voice channel always persists in the active voice category (default is false).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `ephemeral`,
      description: `If true only you will see the reply to this command (default true if channel, false if thread).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction, isPrivate = false) {
  const { guild, channel, member, options } = interaction,
    { id: guildId, name: guildName, channels } = guild

  const activeVoiceCategoryId = await getActiveVoiceCategoryId(guildId),
    inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guildId),
    activeVoiceCategory = channels.cache.get(activeVoiceCategoryId),
    inactiveVoiceCategory = channels.cache.get(inactiveVoiceCategoryId)

  if (
    !activeVoiceCategoryId ||
    !inactiveVoiceCategoryId ||
    !activeVoiceCategory ||
    !inactiveVoiceCategory
  ) {
    if (!activeVoiceCategory) await setActiveVoiceCategoryId(guildId, null)
    if (!inactiveVoiceCategory) await setInactiveVoiceCategoryId(guildId, null)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `It seems that the voice functionality in this server is misconfigured, please contact an admin 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const { name: channelName, id: channelId, type: channelType } = channel

  let name = options.getString(`name`),
    dynamic = options.getBoolean(`dynamic`),
    temporary = options.getBoolean(`temporary`),
    disableChat = options.getBoolean(`disable-chat`),
    alwaysActive = options.getBoolean(`always-active`),
    ephemeral = options.getBoolean(`ephemeral`)

  if (!name) {
    const customFunction = await getChannelCustomFunction(channelId)

    if (customFunction === `voice`) {
      await queueApiCall({
        apiCall: `reply`,
        djsObject: interaction,
        parameters: {
          content:
            "You can't create a voice channel based on another voice channel generated with `/voice` 🤔",
          ephemeral: true,
        },
      })

      return
    }
  }

  const parentChannel = name ? null : channel,
    channelIsThread = parentChannel
      ? checkIfChannelIsSuggestedType(channel, [`thread`, `forum`])
      : false,
    parentTextChannel = channelIsThread
      ? channels.cache.get(parentChannel.parentId)
      : parentChannel,
    parentThread = channelIsThread ? parentChannel : null

  name = name ? name : channelName

  if (channelIsThread) {
    if (dynamic === null) dynamic = false
    if (temporary === null) temporary = true
    if (disableChat === null) disableChat = true
    if (ephemeral === null) ephemeral = false
  } else if (!channelIsThread) {
    if (dynamic === null) dynamic = true
    if (temporary === null) temporary = false
    if (disableChat === null) disableChat = false
    if (ephemeral === null) ephemeral = true
  }

  alwaysActive = alwaysActive ? alwaysActive : false

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: ephemeral },
  })

  const voiceChannelContext = await createVoiceCommandChannel(
    name,
    dynamic,
    temporary,
    disableChat,
    alwaysActive,
    isPrivate,
    guild,
    parentTextChannel,
    parentThread,
    null,
    member
  )

  const {
    message,
    channel: voiceChannel,
    preexisting,
    voiceRecord,
    channelMoved,
    channelInUse,
  } = voiceChannelContext

  switch (message) {
    case `active voice category not set`:
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `Voice categories aren't properly configured, please contact an admin 😬`,
      })

      return
    case `active voice category no longer exists`:
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `Voice categories aren't properly configured, please contact an admin 😬`,
      })

      return
    case `non-permissible`:
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters: `A channel exists, but I can't seem to give you access to it, please contact an admin 😬`,
      })

      return
  }

  const temporaryMessage = temporary
      ? `deleted as it is a temporary voice channel`
      : `moved to the **${inactiveVoiceCategory.name}** category`,
    timerMessage = alwaysActive
      ? ``
      : `\n\n*Note that if no one joins this channel within the next 30 seconds it will be ${temporaryMessage}.*`

  let createMessage

  if (preexisting) {
    const movedMessage = channelMoved ? `was moved to` : `is in`,
      dynamicMessage = voiceRecord?.dynamic
        ? ` But since this is a dynamic voice channel you can join the next channel down if you want to start a new call.`
        : ``,
      channelInUseMessage = channelInUse
        ? `\n\nHeads up, this channel is currently in use by others, feel free to join them if you want of course.${dynamicMessage}`
        : ``,
      _timerMessage = channelInUseMessage ? `` : timerMessage

    createMessage = await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `${voiceChannel} ${movedMessage} the **${activeVoiceCategory.name}** category, click here to join it → ${voiceChannel} 😄` +
        `${channelInUseMessage}${_timerMessage}`,
    })
  } else {
    createMessage = await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `I created ${voiceChannel} and placed it in the **${activeVoiceCategory.name}** category, click here to join it → ${voiceChannel} 😄` +
        `${timerMessage}`,
    })
  }

  await setCreateMessageContext(voiceChannel.id, createMessage)

  delayedDeactivateOrDelete(voiceChannel)
}
