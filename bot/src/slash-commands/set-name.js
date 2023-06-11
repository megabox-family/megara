import { ApplicationCommandOptionType } from 'discord.js'
import { logErrorMessageToChannel } from '../utils/general.js'
import { getWelcomeChannel } from '../repositories/guilds.js'
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

function isNicknameValid(nickname, allowedSymbols) {
  if (nickname.match(`^[A-Za-z]+$`)) return true
  if (nickname.length > 32) return false

  const charArr = nickname.split('')
  let lastValue

  return !charArr.find((currentValue, index) => {
    if (allowedSymbols.includes(currentValue) && index === 0) return true
    else if (currentValue === ' ' && !lastValue.match(`^[A-Za-z]$|^[.]$`))
      return true
    else if (
      ['-', "'", '.'].includes(currentValue) &&
      !lastValue.match(`^[A-Za-z]$`)
    )
      return true
    else if (currentValue.match(`^[A-Za-z]$`) && lastValue === `.`) return true
    else if (
      ![' ', '-', "'", '.'].includes(currentValue) &&
      !currentValue.match(`^[A-Za-z]$`)
    )
      return true

    lastValue = currentValue
  })
}

const handleNicknameFailure = (err, guild) => {
  console.log(err)
  logErrorMessageToChannel(err.message, guild)
}

const timeout = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async function (interaction) {
  const { guild, member, options } = interaction,
    nickname = options.getString(`name`)

  const allowedSymbols = [' ', '-', "'", '.']

  if (!isNicknameValid(nickname, allowedSymbols)) {
    const allowedSymbolList = allowedSymbols.join(`\`, \``)

    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content:
          `Sorry, names must be below 32 characters and cannot contain numbers or most special characters. 😔` +
          `\nHere's a list of acceptable special characters: \`${allowedSymbolList}\` (not including commas)` +
          `\nAllowed special characters cannot be repeating, and spaces must follow periods.` +
          `\nExample: \`/set-name Jason\`, \`/set-name Chris W.\`, \`/set-name Dr. White\`, \`/set-name Brett-Anne\`, \`/set-name O'Brien`,
        ephemeral: true,
      },
    })

    return
  }

  const isOwner = member.id === guild.ownerId ? true : false

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

  let newNickname = nickname.toLowerCase(),
    failed = false

  allowedSymbols.forEach(symbol => {
    newNickname = newNickname
      .split(symbol)
      .map(x => x.charAt(0).toUpperCase() + x.substring(1))
      .join(symbol)
  })

  await queueApiCall({
    apiCall: `fetch`,
    djsObject: guild.members,
  })

  if (newNickname !== member.user.username) {
    // Attempt to set nickname
    try {
      let nicknameIsUpdated = false
      let attempts = 0

      while (!nicknameIsUpdated) {
        await Promise.all([
          queueApiCall({
            apiCall: `setNickname`,
            djsObject: member,
            parameters: newNickname,
          }),
          timeout(1000),
        ])

        let updatedNickname = await member.nickname

        nicknameIsUpdated = updatedNickname === newNickname

        if (!nicknameIsUpdated) {
          attempts++
          logErrorMessageToChannel(
            `Failed to update nickname after ${attempts} second(s), retrying...`,
            guild
          )
        }
      }
    } catch (error) {
      failed = true
      handleNicknameFailure(error, guild)

      await queueApiCall({
        apiCall: `reply`,
        djsObject: interaction,
        parameters: {
          content: `Sorry I wasn't able to change your nickname, you may have a role that is above mine, which prevents me from doing so. 🙇`,
          ephemeral: true,
        },
      })
    }
  } else if (
    newNickname === member.user.username &&
    (await member.nickname) !== newNickname
  ) {
    await queueApiCall({
      apiCall: `setNickname`,
      djsObject: member,
      parameters: null,
    })
  }

  const verifiedRole = guild.roles.cache.find(role => role.name === `verified`)

  if (member.roles.cache.get(verifiedRole.id)) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You're nickname as been set to **${newNickname}** 😁`,
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

  const undergoingVerificationRoleId = guild.roles.cache.find(
      role => role.name === `undergoing-verification`
    ).id,
    userUndergoingVerificationRole = member.roles.cache.find(
      role => role.id === undergoingVerificationRoleId
    ),
    welcomeChannelId = await getWelcomeChannel(guild.id)

  if (userUndergoingVerificationRole) {
    if (welcomeChannelId)
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters:
          `\nCongratulations! 🎉` +
          `\nYour nickname has been changed to **${newNickname}**, and you've been fully verified!` +
          `\nI'd recommend checking out the <#${welcomeChannelId}> channel for more information on what to do next.`,
      })
    else
      await queueApiCall({
        apiCall: `editReply`,
        djsObject: interaction,
        parameters:
          `\nCongratulations! 🎉` +
          `\nYour nickname has been changed to **${newNickname}**, and you've been fully verified!` +
          `\nThis server doesn't have a welcome channel officially set, so if I were you I'd just take a look around 👀`,
      })

    member.roles.remove(undergoingVerificationRoleId)
  } else if (!failed) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Your nickname has been changed to **${newNickname}** 🥰`,
    })
  }
}
