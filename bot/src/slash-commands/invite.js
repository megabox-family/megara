import { MessageActionRow, MessageButton } from 'discord.js'
import { directMessageError } from '../utils/error-logging.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'
import { getRoleByName } from '../utils/roles.js'
import { checkIfMemberIsPermissible } from '../utils/voice.js'
import {
  addMemberToChannel,
  CheckIfMemberNeedsToBeAdded,
} from '../utils/channels.js'

export const description = `Allows you to invite an existing member to any channel you're a part of in this server.`
export const defaultPermission = false,
  options = [
    {
      name: `username-and-tag-or-id`,
      description: `The username & tag or id of the member. Examples: Zedd#4752, 360140791936712704`,
      type: `STRING`,
      required: true,
    },
  ]

function CheckIfVerificationLevelIsMismatched(member, _channel) {
  const guild = member.guild,
    channelId = [`GUILD_PUBLIC_THREAD`, `GUILD_PRIVATE_THREAD`].includes(
      _channel.type
    )
      ? _channel.parentId
      : null,
    channel = channelId ? guild.channels.cache.get(channelId) : _channel,
    guildRoles = guild.roles.cache,
    verifiedRole = getRoleByName(guildRoles, `verified`),
    memberVerificationLevel = member._roles.includes(verifiedRole.id)
      ? `verified`
      : `unverified`,
    everyoneRole = getRoleByName(guildRoles, `@everyone`),
    channelEveryoneOverwrite = channel.permissionOverwrites.cache.get(
      everyoneRole.id
    ),
    everyoneAllowPermissions = channelEveryoneOverwrite.allow.serialize(),
    everyoneDenyPermissions = channelEveryoneOverwrite.deny.serialize(),
    everyoneRolePermissions = everyoneRole.permissions.serialize(),
    isUnverified =
      !everyoneAllowPermissions.VIEW_CHANNEL &&
      !everyoneDenyPermissions.VIEW_CHANNEL
        ? everyoneRolePermissions.VIEW_CHANNEL
        : everyoneAllowPermissions.VIEW_CHANNEL

  if (memberVerificationLevel === `unverified` && !isUnverified) return true
  else return false
}

export default async function (interaction) {
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
    interaction.reply({
      content: `You provided an invalid username & tag or id, keep in mind that this invite feature only works for users who are *already in the server* 🤔`,
      ephemeral: true,
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
    interaction.reply({
      content: `You tried inviting an unverified member to a verified channel, this member must first finish the verification process before gaining access to this channel 🤔`,
      ephemeral: true,
    })

    return
  }

  if (channel.type === `GUILD_VOICE`) {
    const memberIsPermissible = checkIfMemberIsPermissible(
        channel,
        invitedMember
      ),
      category = guild.channels.cache.get(channel.parentId),
      categoryContext = category ? ` in the **${category.name}** category` : ``

    let messageContent = `${member} from the **${guild}** server has invited you to the **${channel}** voice channel${categoryContext} 🙌`

    if (memberIsPermissible === true) {
      messageContent += `\nIf you're interested you can join this voice channel from this message by clicking here → ${channel}`

      invitedMember
        .send({
          content: messageContent,
        })
        .catch(error => directMessageError(error, invitedMember))
    } else {
      const joinChannelButton = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`!join-voice-channel: ${channel.id}`)
          .setLabel(`Join ${channel.name}`)
          .setStyle('PRIMARY')
      )

      messageContent += `\nHowever, you currently don't have access to this voice channel, click the button below to gain access.`

      invitedMember
        .send({
          content: messageContent,
          components: [joinChannelButton],
        })
        .catch(error => directMessageError(error, invitedMember))
    }

    interaction.reply({
      content: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
      ephemeral: true,
    })
  } else if (
    [`GUILD_PUBLIC_THREAD`, `GUILD_PRIVATE_THREAD`].includes(channel.type)
  ) {
    const thread = channel,
      parentChannel = guild.channels.cache.get(thread.parentId),
      isJoinable = await getIdForJoinableChannel(parentChannel)

    if (!isJoinable) {
      interaction.reply({
        content: `The ${channel} channel is not a channel that anyone can join or leave 🤔`,
        ephemeral: true,
      })

      return
    }

    if (thread.members.cache.get(invitedMember.id)) {
      interaction.reply({
        content: `${invitedMember} is already part of this thread 🤔`,
        ephemeral: true,
      })

      return
    }

    const joinThreadButton = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(
            `!join-invite-thread: ${JSON.stringify({
              channel: parentChannel.id,
              thread: thread.id,
            })}`
          )
          .setLabel(`Join ${thread.name}`)
          .setStyle('PRIMARY')
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

    interaction.reply({
      content: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
      ephemeral: true,
    })
  } else if (channel.type === `GUILD_TEXT`) {
    const context = await CheckIfMemberNeedsToBeAdded(invitedMember, channel.id)

    if (!context) {
      interaction.reply({
        content: `${channel} is not a channel that anyone can be added to or removed from 🤔`,
        ephemeral: true,
      })

      return
    } else if (context === `already added`) {
      interaction.reply({
        content: `${invitedMember} is already a part of ${channel} 🤔`,
        ephemeral: true,
      })

      return
    }

    const joinButton = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`!join-channel: ${channel.id}`)
          .setLabel(`Join ${channel.name}`)
          .setStyle('PRIMARY')
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

    interaction.reply({
      content: `I sent a message to ${invitedMember} inviting them to ${channel} 👍`,
      ephemeral: true,
    })
  }
}
