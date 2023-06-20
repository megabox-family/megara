import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import { checkIfChannelTypeIsThread, checkType } from '../utils/channels.js'
import {
  checkIfRoomOrTextChannel,
  createVoiceChannel,
  getChannelBasename,
  getChannelNumber,
  queueDelayedVoiceDelete,
} from '../utils/voice.js'
import { getDynamicVoiceRecordById } from '../repositories/voice.js'
import { queueApiCall } from '../api-queue.js'
import {
  getActiveVoiceCategoryId,
  setActiveVoiceCategoryId,
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
      name: `private`,
      description: `Contributors only; choose if the channel is private, /invite others (default is false).`,
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

export default async function (interaction) {
  const { guild, channel, member, options } = interaction,
    { id: guildId, name: guildName, channels } = guild

  const activeVoiceCategoryId = await getActiveVoiceCategoryId(guildId)

  if (!activeVoiceCategoryId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `There is currently no active voice category set in **${guildName}**, please set this before using \`/voice\` 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const activeVoiceCategory = channels.cache.get(activeVoiceCategoryId)

  if (!activeVoiceCategory) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `The category previously set as the active voice category no longer exists, please set this before using \`/voice\` 🤔`,
        ephemeral: true,
      },
    })

    await setActiveVoiceCategoryId(guildId, null)

    return
  }

  const { name: channelName, id: channelId, type: channelType } = channel

  let name = options.getString(`name`),
    dynamic = options.getBoolean(`dynamic`),
    temporary = options.getBoolean(`temporary`),
    disableChat = options.getBoolean(`disable-chat`),
    alwaysActive = options.getBoolean(`always-active`),
    isPrivate = options.getBoolean(`private`),
    ephemeral = options.getBoolean(`ephemeral`)

  if (!name) {
    const dynamicVoiceRecord = await getDynamicVoiceRecordById(channelId)

    if (dynamicVoiceRecord) {
      await queueApiCall({
        apiCall: `deferReply`,
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
      ? checkIfChannelTypeIsThread(channelType)
      : false,
    parentTextChannel = channelIsThread
      ? channels.cache.get(parentChannel.parentId)
      : parentChannel,
    parentThread = channelIsThread ? parentChannel : null

  name = name ? name : channelName

  if (channelIsThread) {
    if (dynamic === undefined) dynamic = false
    if (temporary === undefined) temporary = true
    if (disableChat === undefined) disableChat = true
    if (ephemeral === undefined) ephemeral = false
  } else if (!channelIsThread) {
    if (dynamic === undefined) dynamic = true
    if (temporary === undefined) temporary = false
    if (disableChat === undefined) disableChat = false
    if (ephemeral === undefined) ephemeral = true
  }

  alwaysActive = alwaysActive ? alwaysActive : false
  isPrivate = isPrivate ? isPrivate : false

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: ephemeral },
  })

  const voiceChannel = await createVoiceChannel(
    name,
    dynamic,
    alwaysActive,
    isPrivate,
    guild,
    parentTextChannel,
    parentThread,
    member
  )

  console.log(voiceChannel)

  return

  if (!voiceChannel) {
    let voiceChannel = guild.channels.cache.find(
      channel =>
        channel.name === voiceChannelName &&
        channel.type === ChannelType.GuildVoice
    )

    await interaction.editReply({
      content: `The **${voiceChannel}** voice channel already exists 🤔`,
    })

    return
  }

  const voiceChannelType = await checkIfRoomOrTextChannel(voiceChannel, guild)

  await interaction.editReply({
    content:
      `The **${voiceChannel}** voice channel has been created, have fun 😁` +
      `\n\n*Note that if no one joins a voice channel generated by this command within 30 seconds of creation it will be automatically deleted.*`,
  })

  queueDelayedVoiceDelete(voiceChannel, voiceChannelType)
}
