import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js'
import { checkIfVerified, getNicknameOrUsername } from '../utils/members.js'
import { checkIfMemberIsPermissible } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'
import {
  getNumberNotDescriminator,
  isFirstCharacterAtSymbol,
  removeSpacesAfterCommas,
} from '../utils/validation.js'
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
      name: `members`,
      description: `Comma delimited list of @s, username#discriminators, or user ids. Examples: @Zed, bob#0001, 36014079`,
      type: ApplicationCommandOptionType.String,
      required: true,
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

const invalidTagMessage =
  `You tried tagging someone (@someone), but you didn't *actually* tag them. If the text stays white that means: \n` +
  "- You're spelling their tag (username/nickname) wrong after the `@`.\n" +
  `- The member doesn't have access to this channel.\n` +
  `In the case that the member doesn't have access to this channel you need to:\n` +
  `1. Use their username + discriminator [username#descriminator], ie bob#2301.\n` +
  `2. Use their id, ie 598729034867933195 → [how-to](<https://www.youtube.com/watch?v=vskWZbNa7qo>).\n\n`

function generateConfirmationMessage(
  someInvalidTags,
  someInvalidMembers,
  someUnverifiedMembers,
  verifiedMembers,
  channel
) {
  let confirmationMessage = ``

  if (someInvalidTags) confirmationMessage += invalidTagMessage

  if (someInvalidMembers && someUnverifiedMembers)
    confirmationMessage += `You provided one or more invalid username#discriminators or ids. And one or more of the members you tried to invite were unverified. `
  else if (someInvalidMembers)
    confirmationMessage += `You provided one or more invalid username#discriminators or ids. `
  else if (someUnverifiedMembers)
    confirmationMessage += `One or more of the members you tried to invite were unverified. `

  confirmationMessage = confirmationMessage
    ? (confirmationMessage += `Nevertheless...`)
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
    invitedMembers = options.getString(`members`),
    optionChannel = options.getChannel(`channel`),
    _channel = optionChannel ? optionChannel : channel,
    membersString = removeSpacesAfterCommas(invitedMembers)

  const memberStringArray = membersString.split(`,`)

  let someInvalidTags = false

  const memberArray = [
      ...new Set(
        memberStringArray.map(memberString => {
          if (isFirstCharacterAtSymbol(memberString)) someInvalidTags = true

          const userId = getNumberNotDescriminator(memberString)

          return userId
            ? members.cache.get(userId)
            : members.cache.find(member => {
                const { username, discriminator } = member.user

                console.log(`${username}#${discriminator}`, memberString)

                if (`${username}#${discriminator}` === memberString) return true
              })
        })
      ),
    ],
    validMemberArray = memberArray.filter(member => member)

  if (validMemberArray.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        invalidTagMessage +
        `You provided an invalid list of username#discriminators or ids. Keep in mind that this invite feature only works for members, ie users who are *already in the server* 🤔`,
    })

    return
  }

  const someInvalidMembers = memberArray?.length !== validMemberArray?.length,
    verifiedMembers = validMemberArray.filter(member => checkIfVerified(member))

  if (verifiedMembers.length === 0) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: someInvalidMembers
        ? `You provided a list of invalid and unverified members 🤔`
        : `You provided a list of unverified members 🤔`,
    })

    return
  }

  const { type } = _channel,
    someUnverifiedMembers = verifiedMembers?.length !== validMemberArray?.length

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
    someInvalidTags,
    someInvalidMembers,
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
