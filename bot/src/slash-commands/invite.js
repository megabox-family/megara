import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js'
import { filterVerifiedUsers, getNicknameOrUsername } from '../utils/members.js'
import { checkIfMemberIsPermissible } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'
import { collator } from '../utils/general.js'

const {
  AnnouncementThread,
  GuildAnnouncement,
  GuildForum,
  GuildStageVoice,
  GuildText,
  GuildVoice,
  PrivateThread,
  PublicThread,
} = ChannelType

export const description = `Allows you to invite members to the channel in-which you use this command.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `member`,
      description: `The member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: true,
      autocomplete: true,
    },
    {
      name: `member-2`,
      description: `Another member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: false,
      autocomplete: true,
    },
    {
      name: `member-3`,
      description: `Another member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: false,
      autocomplete: true,
    },
    {
      name: `member-4`,
      description: `Another member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: false,
      autocomplete: true,
    },
    {
      name: `member-5`,
      description: `Another member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: false,
      autocomplete: true,
    },
    {
      name: `member-6`,
      description: `Another member you would like to invite.`,
      type: ApplicationCommandOptionType.User,
      required: false,
      autocomplete: true,
    },
    {
      name: `channel`,
      description: `The channel you want to invite the member to (defaults to the channel /invite is used in).`,
      type: ApplicationCommandOptionType.Channel,
      required: false,
      autocomplete: true,
      channelTypes: [
        AnnouncementThread,
        GuildAnnouncement,
        GuildForum,
        GuildStageVoice,
        GuildText,
        GuildVoice,
        PrivateThread,
        PublicThread,
      ],
    },
  ]

function generateConfirmationMessage(
  someUnverifiedMembers,
  verifiedMembers,
  channel
) {
  let confirmationMessage = ``

  if (someUnverifiedMembers)
    confirmationMessage += `One or more of the members you tried to invite were unverified.\n\n`

  confirmationMessage = confirmationMessage
    ? (confirmationMessage += `Nevertheless... `)
    : ``

  const memberNameArray = verifiedMembers
      .map(verifiedMember =>
        getNicknameOrUsername(verifiedMember, verifiedMember.user)
      )
      .sort((a, b) => collator.compare(a, b)),
    memberDisplayString = memberNameArray.join(`\n- `)

  confirmationMessage +=
    verifiedMembers.length === 1
      ? `**${memberNameArray[0]}** has been invited to ${channel} 🙌`
      : `Below is a list of members I was able to invite to ${channel} 🙌` +
        `\n- ${memberDisplayString}`

  return confirmationMessage
}

async function handleVoiceChannel(channel, invitedMembers, member) {
  const { guild, name: channelName } = channel,
    joinChannelButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`!join-voice-channel: ${channel.id}`)
        .setLabel(`join ${channelName}`)
        .setStyle(ButtonStyle.Primary)
    ),
    inviteMessageArray = invitedMembers.map(invitedMember => {
      const memberIsPermissible = checkIfMemberIsPermissible(
          channel,
          invitedMember
        ),
        returnObject = { member: invitedMember }

      if (memberIsPermissible === true) {
        returnObject.message = `${member} has invited you to ${channel} ← click here to jump to it 😊`
      } else {
        returnObject.message = {
          content:
            `${member} from **${guild}** has invited you to the **#${channelName}** voice channel 🙌` +
            `\n\nHowever, you don't currently have access. Press the button below to gain access.`,
          components: [joinChannelButton],
        }
      }

      return returnObject
    })

  await Promise.all(
    inviteMessageArray?.map(async inviteMessage => {
      const { member, message } = inviteMessage

      await queueApiCall({
        apiCall: `send`,
        djsObject: member,
        parameters: message,
      })
    })
  )
}

async function handleThread(channel, verifiedMembers, member) {
  const thread = channel,
    { id, guild, name, parentId, members } = thread

  const parentChannel = guild.channels.cache.get(parentId),
    inviteMessageArray = verifiedMembers.map(verifiedMember => {
      const memberIsPermissibleInParent = checkIfMemberIsPermissible(
          parentChannel,
          verifiedMember
        ),
        returnObject = { member: verifiedMember },
        memberIsPermissibleInThread =
          members.cache.get(verifiedMember?.id) ||
          (memberIsPermissibleInParent &&
            thread.type === ChannelType.PublicThread)

      if (memberIsPermissibleInThread)
        returnObject.message = `${member} has invited you to view ${thread} ← click here to jump to it 😊`
      else {
        const joinThreadButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                `!join-invite-thread: ${JSON.stringify({
                  channelId: parentChannel.id,
                  threadId: id,
                })}`
              )
              .setLabel(`join ${name}`)
              .setStyle(ButtonStyle.Primary)
          ),
          category = guild.channels.cache.get(parentChannel.parentId),
          categoryContext = category
            ? ` in the **${category.name}** category`
            : ``

        returnObject.message = {
          content:
            `${member} from **${guild}** has invited you to the **#${name}** thread within the **#${parentChannel.name}** channel${categoryContext} 🙌` +
            `\nIf you're interested in joining, click the button below:`,
          components: [joinThreadButton],
        }
      }

      return returnObject
    })

  await Promise.all(
    inviteMessageArray?.map(async inviteMessage => {
      const { member, message } = inviteMessage

      await queueApiCall({
        apiCall: `send`,
        djsObject: member,
        parameters: message,
      })
    })
  )
}

async function handleTextChannel(channel, verifiedMembers, member) {
  const { id, guild, name, parentId } = channel

  const inviteMessageArray = verifiedMembers.map(verifiedMember => {
    const memberIsPermissible = checkIfMemberIsPermissible(
        channel,
        verifiedMember
      ),
      returnObject = { member: verifiedMember }

    if (memberIsPermissible)
      returnObject.message = `${member} has invited you to view ${channel} ← click here to jump to it 😊`
    else {
      const joinChannelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`!join-channel: ${id}`)
            .setLabel(`join ${name}`)
            .setStyle(ButtonStyle.Primary)
        ),
        category = guild.channels.cache.get(parentId),
        categoryContext = category
          ? ` in the **${category.name}** category`
          : ``

      returnObject.message = {
        content:
          `${member} from **${guild}** has invited you to **#${name}**${categoryContext} 🙌` +
          `\nIf you're interested in joining, click the button below:`,
        components: [joinChannelButton],
      }
    }

    return returnObject
  })

  await Promise.all(
    inviteMessageArray?.map(async inviteMessage => {
      const { member, message } = inviteMessage

      await queueApiCall({
        apiCall: `send`,
        djsObject: member,
        parameters: message,
      })
    })
  )
}

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, member, options, channel } = interaction,
    { members } = guild,
    invitedMember1 = options.getUser(`member`),
    invitedMember2 = options.getUser(`member-2`),
    invitedMember3 = options.getUser(`member-3`),
    invitedMember4 = options.getUser(`member-4`),
    invitedMember5 = options.getUser(`member-5`),
    invitedMember6 = options.getUser(`member-6`),
    memberArray = [
      invitedMember1,
      invitedMember2,
      invitedMember3,
      invitedMember4,
      invitedMember5,
      invitedMember6,
    ]
      .filter(user => user)
      .map(user => members.cache.get(user?.id)),
    optionChannel = options.getChannel(`channel`),
    _channel = optionChannel ? optionChannel : channel

  const verifiedMembers = await filterVerifiedUsers(guild.id, memberArray)

  if (verifiedMembers.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You provided a list of unverified members 🤔`,
    })

    return
  }

  const { type } = _channel,
    someUnverifiedMembers = verifiedMembers?.length !== memberArray?.length

  if (type === ChannelType.GuildVoice) {
    await handleVoiceChannel(_channel, verifiedMembers, member)
  } else if (
    [ChannelType.PublicThread, ChannelType.PrivateThread].includes(type)
  ) {
    await handleThread(_channel, verifiedMembers, member)
  } else {
    await handleTextChannel(_channel, verifiedMembers, member)
  }

  const confirmationMessage = generateConfirmationMessage(
    someUnverifiedMembers,
    verifiedMembers,
    _channel
  )

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: confirmationMessage,
  })
}
