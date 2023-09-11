import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js'
import { checkIfMemberIsPermissible } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'

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

let globalMember, globalGuild

const memberAndGuildContext = () =>
    `${globalMember} from **${globalGuild.name}** has invited you to`,
  unknownMessage = `The above link may show as "#unknown" momentarily, but the link should still work fine.`

function generateConfirmationMessage(members, channel) {
  const memberNameArray = members.map(member => `<@${member.id}>`),
    memberDisplayString = memberNameArray.join(`\n- `)

  const confirmationMessage =
    members.length === 1
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
        returnObject.message =
          `${memberAndGuildContext()} the **${
            channel.name
          }** voice channel, click here to join it → ${channel} 😊` +
          `\n\n${unknownMessage} Don't forget to add the channel to your channel list if you'd like to be a part of it permanently 👍`
      } else {
        returnObject.message = {
          content:
            `${memberAndGuildContext()} the **#${channelName}** voice channel 🙌` +
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

async function handleThread(channel, invitedMembers, member) {
  const thread = channel,
    { id, guild, name, parentId, members } = thread

  const parentChannel = guild.channels.cache.get(parentId),
    parentIsForum = parentChannel.type === ChannelType.GuildForum,
    inviteMessageArray = invitedMembers.map(invitedMember => {
      const memberIsPermissibleInParent = checkIfMemberIsPermissible(
          parentChannel,
          invitedMember
        ),
        returnObject = { member: invitedMember },
        memberIsPermissibleInThread =
          members.cache.get(invitedMember?.id) ||
          (memberIsPermissibleInParent &&
            thread.type === ChannelType.PublicThread),
        channelType = parentIsForum ? `post` : `thread`

      if (memberIsPermissibleInThread) {
        let message = `${memberAndGuildContext()} view the **#${
          thread.name
        }** ${channelType}, click here to jump to it → ${thread} 😊`

        if (parentIsForum)
          message += `\n\n${unknownMessage} Don't forget to follow the post if you'd like to be a part of it permanently 👍`
        else
          message += `\n\n${unknownMessage} Don't forget to join the thread if you'd like to be a part of it permanently 👍`

        returnObject.message = message
      } else {
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
            `${memberAndGuildContext()} the **#${name}** ${channelType} within the **#${
              parentChannel.name
            }** channel${categoryContext} 🙌` +
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

async function handleTextChannel(channel, members, member) {
  const { id, guild, name, parentId } = channel

  const inviteMessageArray = members.map(invitedMember => {
    const memberIsPermissible = checkIfMemberIsPermissible(
        channel,
        invitedMember
      ),
      returnObject = { member: invitedMember }

    if (memberIsPermissible)
      returnObject.message =
        `${memberAndGuildContext()} view the **#${
          channel.name
        }** text channel, click here to join it → ${channel} 😊` +
        `\n\n${unknownMessage} Don't forget to add the channel to your channel list if you'd like to be a part of it permanently 👍`
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
          `${memberAndGuildContext()} **#${name}**${categoryContext} 🙌` +
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
      }).catch(err => {
        if (err.code === 50007) {
          console.log('Someone tried to invite Megara...')
        }
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

  const { guild, member, options, channel } = interaction

  globalMember = member
  globalGuild = guild

  const invitedMember1 = options.getUser(`member`),
    invitedMember2 = options.getUser(`member-2`),
    invitedMember3 = options.getUser(`member-3`),
    invitedMember4 = options.getUser(`member-4`),
    invitedMember5 = options.getUser(`member-5`),
    invitedMember6 = options.getUser(`member-6`),
    invitedMembers = [
      invitedMember1,
      invitedMember2,
      invitedMember3,
      invitedMember4,
      invitedMember5,
      invitedMember6,
    ]
      .filter(user => user)
      .map(user => guild.members.cache.get(user?.id)),
    optionChannel = options.getChannel(`channel`),
    _channel = optionChannel ? optionChannel : channel

  const { type } = _channel

  if (type === ChannelType.GuildVoice) {
    await handleVoiceChannel(_channel, invitedMembers, member)
  } else if (
    [ChannelType.PublicThread, ChannelType.PrivateThread].includes(type)
  ) {
    await handleThread(_channel, invitedMembers, member)
  } else {
    await handleTextChannel(_channel, invitedMembers, member)
  }

  const confirmationMessage = generateConfirmationMessage(
    invitedMembers,
    _channel
  )

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: confirmationMessage,
  })
}
