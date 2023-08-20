import {
  ApplicationCommandOptionType,
  ChannelType,
  channelLink,
} from 'discord.js'
import { getChannelCustomFunction } from '../repositories/channels.js'
import { getCommandByName } from '../utils/slash-commands.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'
import { pushToChannelSortingQueue } from '../utils/channels.js'
import {
  deactivateOrDeleteVoiceChannel,
  delayedDeactivateOrDelete,
} from '../utils/voice.js'

export const description = `Moves a voice channel created by the /create-voice-channel command to the active voice category.`
export const dmPermission = false,
  options = [
    {
      name: `voice-channel`,
      description: `The voice channel that you'd like to activate.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [ChannelType.GuildVoice],
    },
    {
      name: `ephemeral`,
      description: `If true only you will see the reply to this command (default is true).`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ]

export default async function (interaction) {
  const { guild, options } = interaction,
    voiceChannel = options.getChannel(`voice-channel`),
    { id, parentId } = voiceChannel,
    voiceChannelCustomFunction = await getChannelCustomFunction(id)

  if (voiceChannelCustomFunction !== `voice`) {
    const voiceCommand = getCommandByName(`create-voice-channel`)

    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `The channel you selected was not created by the </create-voice-channel:${voiceCommand.id}> command 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  let ephemeral = options.getBoolean(`ephemeral`)

  ephemeral = ephemeral == null ? true : false

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: ephemeral },
  })

  const activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id)

  if (parentId === activeVoiceCategoryId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `The requested channel is already activated → ${voiceChannel} ← click here to join it 🙌\n`,
      },
    })

    return
  }

  await queueApiCall({
    apiCall: `setParent`,
    djsObject: voiceChannel,
    parameters: [activeVoiceCategoryId, { lockPermissions: false }],
    multipleParameters: true,
  })

  pushToChannelSortingQueue({ guildId: guild.id, bypassComparison: true })

  const inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id),
    inactiveVoiceCategory = guild.channels.cache.get(inactiveVoiceCategoryId)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content:
        `The requested channel has been activated → ${voiceChannel} ← click here to join it 🙌` +
        `\n\n*Note that if no one joins this channel within the next 30 seconds it will be moved to the **${inactiveVoiceCategory.name}** category.*`,
    },
  })

  delayedDeactivateOrDelete(voiceChannel)
}
