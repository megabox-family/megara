import { ApplicationCommandOptionType } from 'discord.js'
import { logErrorMessageToChannel } from '../utils/general.js'
import {
  getWelcomeChannel,
  getUndergoingVerificationRoleId,
  getVerifiedRoleId,
  getAdminRoleId,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to set your nickname within this server, and verifies you if you haven't been.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `name`,
      description: `The nickname you want in this server (use real life nickname pls).`,
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
    verifiedRoleId = await getVerifiedRoleId(guild.id),
    undergoingVerificationRole = guild.roles.cache.get(
      undergoingVerificationRoleId
    ),
    verifiedRole = guild.roles.cache.get(verifiedRoleId),
    adminRoleId = await getAdminRoleId(guild.id),
    adminRole = guild.roles.cache.get(adminRoleId)

  if (
    !undergoingVerificationRoleId ||
    !undergoingVerificationRole ||
    !verifiedRoleId ||
    !verifiedRole
  ) {
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

  return

  if (nickname !== member.user.username) {
    // Attempt to set nickname

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

  // const verifiedRole = guild.roles.cache.find(role => role.name === `verified`)

  if (member.roles.cache.get(verifiedRole.id)) {
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

  // Attempt to set verified role
  try {
    let roleIsUpdated = false
    let attempts = 0

    while (!roleIsUpdated) {
      await queueApiCall({
        apiCall: `add`,
        djsObject: member.roles,
        parameters: verifiedRole.id,
      })

      await new Promise(resolution => setTimeout(resolution, 1000))

      roleIsUpdated = await member.roles.cache.some(
        x => x.id === verifiedRole.id
      )

      if (!roleIsUpdated) {
        attempts++
        logErrorMessageToChannel(
          `Failed to update role after ${attempts} second(s), retrying...`,
          guild
        )
      }
    }
  } catch (error) {
    failed = true
    handleNicknameFailure(error, guild)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Sorry I wasn't able to change your nickname, you may have a role that is above mine, which prevents me from doing so. 🙇`,
    })
  }

  // const undergoingVerificationRoleId = guild.roles.cache.find(
  //     role => role.name === `undergoing-verification`
  //   ).id,
  //   userUndergoingVerificationRole = member.roles.cache.find(
  //     role => role.id === undergoingVerificationRoleId
  //   ),
  //   welcomeChannelId = await getWelcomeChannel(guild.id)

  if (userUndergoingVerificationRole) {
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

    member.roles.remove(undergoingVerificationRoleId)
  } else if (!failed) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Your nickname has been changed to **${nickname}** 🥰`,
    })
  }
}
