import { ApplicationCommandOptionType } from 'discord.js'
import {
  getWelcomeChannel,
  getUndergoingVerificationRoleId,
  getAdminRoleId,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to set your nickname within this server, and verifies you if you haven't been.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `name`,
      description: `The nickname you want in this server (use real life name pls).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

export default async function (interaction) {
  const { guild, member, options } = interaction,
    nickname = options.getString(`name`),
    isOwner = member.id === guild.ownerId ? true : false

  if (isOwner) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `I cannot change the nickname of the owner of the server, your permissions are too great. 🙇`,
        ephemeral: true,
      },
    })

    return
  }

  const undergoingVerificationRoleId = await getUndergoingVerificationRoleId(
      guild.id
    ),
    undergoingVerificationRole = guild.roles.cache.get(
      undergoingVerificationRoleId
    ),
    adminRoleId = await getAdminRoleId(guild.id),
    adminRole = guild.roles.cache.get(adminRoleId)

  if (!undergoingVerificationRoleId || !undergoingVerificationRole) {
    const messageContent = adminRole
      ? `It looks like the verification roles haven't been set up yet, I'll ping the admins. ${adminRole}`
      : `Oops! Looks like verification is broken. Reach out to whoever invited you to **${guild.name}** 😅`

    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: messageContent,
        allowedMentions: { roles: [adminRoleId] },
      },
    })
    return
  }

  if (nickname !== member.user.username) {
    await queueApiCall({
      apiCall: `setNickname`,
      djsObject: member,
      parameters: nickname,
    })
  } else if (
    nickname === member.user.username &&
    member.nickname !== nickname
  ) {
    await queueApiCall({
      apiCall: `setNickname`,
      djsObject: member,
      parameters: null,
    })
  }

  if (!member.roles.cache.get(undergoingVerificationRoleId)) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `Your nickname as been set to **${nickname}** 😁`,
        ephemeral: true,
      },
    })

    return
  }

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const welcomeChannelId = await getWelcomeChannel(guild.id)

  if (welcomeChannelId)
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `\nCongratulations! 🎉` +
        `\nYour nickname has been changed to **${nickname}**, and you've been fully verified!` +
        `\nI'd recommend checking out the <#${welcomeChannelId}> channel for more information on what to do next.`,
    })
  else
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `\nCongratulations! 🎉` +
        `\nYour nickname has been changed to **${nickname}**, and you've been fully verified!` +
        `\nThis server doesn't have a welcome channel officially set, so if I were you I'd just take a look around 👀`,
    })

  await queueApiCall({
    apiCall: `remove`,
    djsObject: member.roles,
    parameters: undergoingVerificationRoleId,
  })
}
