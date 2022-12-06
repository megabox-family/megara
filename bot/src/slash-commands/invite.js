import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { CheckIfVerificationLevelIsMismatched } from '../utils/members.js'
import { CheckIfMemberNeedsToBeAdded } from '../utils/channels.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'
import { handleVoiceChannel } from '../utils/slash-commands.js'

export const description = `Allows you to invite an existing member to the channel you use this command in.`
export const dmPermission = false,
  defaultMemberPermissions = 0,
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
    options = interaction.options,
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

  const channel = interaction.channel

  if (!channel) return

  const mismatchedVerificationLevel = CheckIfVerificationLevelIsMismatched(
    invitedMember,
    channel
  )

  if (mismatchedVerificationLevel) {
    await interaction.editReply({
      content: `You tried inviting an unverified member to a verified channel, this member must first finish the verification process before gaining access to this channel 🤔`,
    })

    return
  }

  if (channel.type === ChannelType.GuildVoice) {
    await handleVoiceChannel(channel, invitedMember, interaction)
  } else if (
    [ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type)
  ) {
    const thread = channel

    const parentChannel = guild.channels.cache.get(thread.parentId),
      isJoinable = await getIdForJoinableChannel(parentChannel)

    if (!isJoinable) {
      await interaction.editReply({
        content: `
          This thread exists within a channel (${channel}) that no one can join or leave 🤔\

          \n**Note: If this thread exists within a public channel, just @ the member to add them to the thread.**
        `,
      })

      return
    }

    if (thread.members.cache.get(invitedMember.id)) {
      await interaction.editReply({
        content: `${invitedMember} is already part of this thread 🤔`,
      })

      return
    }

    const joinThreadButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `!join-invite-thread: ${JSON.stringify({
              channel: parentChannel.id,
              thread: thread.id,
            })}`
          )
          .setLabel(`Join ${thread.name}`)
          .setStyle(ButtonStyle.Primary)
      ),
      category = guild.channels.cache.get(parentChannel.parentId),
      categoryContext = category ? ` in the **${category.name}** category` : ``

    invitedMember
      .send({
        content: `
          ${member} from the **${guild}** server has invited you to the **${thread}** thread within the ${parentChannel} channel${categoryContext} 🙌\
          \nIf you're interested in joining, click the button below:
        `,
        components: [joinThreadButton],
      })
      .catch(error => directMessageError(error, invitedMember))

    await interaction.editReply({
      content: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
    })
  } else if (channel.type === ChannelType.GuildText) {
    const context = await CheckIfMemberNeedsToBeAdded(invitedMember, channel.id)

    if (!context) {
      await interaction.editReply({
        content: `${channel} is not a channel that anyone can be added to or removed from 🤔`,
      })

      return
    } else if (context === `already added`) {
      await interaction.editReply({
        content: `${invitedMember} is already a part of ${channel} 🤔`,
      })

      return
    }

    const joinButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`!join-channel: ${channel.id}`)
          .setLabel(`Join ${channel.name}`)
          .setStyle(ButtonStyle.Primary)
      ),
      category = guild.channels.cache.get(channel.parentId),
      categoryContext = category ? ` in the **${category.name}** category` : ``

    invitedMember
      .send({
        content: `
        ${member} from the **${guild}** server has invited you to the **${channel}** channel${categoryContext} 🙌\
        \nIf you're interested in joining, click the button below:
      `,
        components: [joinButton],
      })
      .catch(error => directMessageError(error, invitedMember))

    await interaction.editReply({
      content: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
    })
  }
}
