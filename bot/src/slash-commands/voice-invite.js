import { ApplicationCommandOptionType } from 'discord.js'
import { getAllVoiceChannelIds } from '../repositories/channels.js'
import { CheckIfVerificationLevelIsMismatched } from '../utils/members.js'
import { handleVoiceChannel } from '../utils/slash-commands.js'

export const description = `Allows you to invite an existing member to the voice channel you're currently in.`
export const dmPermission = false,
  defaultMemberPermissions = false,
  options = [
    {
      name: `username-and-tag-or-id`,
      description: `The username & tag or id of the member. Examples: Zedd#4752, 360140791936712704`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    member = interaction.member,
    voiceChannelIds = await getAllVoiceChannelIds(guild.id),
    voiceChannels = voiceChannelIds.map(voiceChannelId =>
      guild.channels.cache.get(voiceChannelId)
    ),
    voiceChannel = voiceChannels.find(voiceChannel =>
      voiceChannel.members.get(member.id)
    )

  if (!voiceChannel) {
    await interaction.editReply({
      content: `You must be in a call to use the \`/voice-invite\` command 🤔`,
    })

    return
  }

  const options = interaction.options,
    invitedUsername = options.getString(`username-and-tag-or-id`)

  let invitedMember = guild.members.cache.find(member => {
    const user = member.user,
      username = user.username,
      tag = user.discriminator

    if (`${username}#${tag}` === invitedUsername) return true
  })

  if (!invitedMember) {
    invitedMember = guild.members.cache.get(invitedUsername)
  }

  if (!invitedMember) {
    await interaction.editReply({
      content: `You provided an invalid username & tag or id, keep in mind that this invite feature only works for users who are *already in the server* 🤔`,
    })

    return
  }

  const mismatchedVerificationLevel = CheckIfVerificationLevelIsMismatched(
    invitedMember,
    voiceChannel
  )

  if (mismatchedVerificationLevel) {
    await interaction.editReply({
      content: `You tried inviting an unverified member to a verified channel, this member must first finish the verification process before gaining access to this channel 🤔`,
    })

    return
  }

  await handleVoiceChannel(voiceChannel, invitedMember, interaction)
}
