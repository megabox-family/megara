import { ApplicationCommandOptionType } from 'discord.js'
import createVoiceChannel from './create-voice-channel.js'

export const description = `Creates a new private voice channel with variable functionality.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `name`,
      description: `The name of the voice channel you're creating (defaults to the name of the channel you're in).`,
      type: ApplicationCommandOptionType.String,
      required: true,
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

export default async function (interaction) {
  await createVoiceChannel(interaction, true)
}
