import { ApplicationCommandOptionType } from 'discord.js'
import { roleSortPauseDuration } from '../utils/roles.js'
import { queueApiCall } from '../api-queue.js'

export const description = `Allows you to change your name's display color using a hexcode.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `color-hex-code`,
      description: `The hex code that represents the color you'd like your name to display as (input 'null' to clear).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

async function clearOtherColorRoles(member) {
  const { roles } = member,
    currentColorRoles = []

  roles.cache.forEach(role => {
    if (role.name.match(`^~.+~$`)) {
      currentColorRoles.push(role)
    }
  })

  if (currentColorRoles.length > 0)
    await queueApiCall({
      apiCall: `remove`,
      djsObject: roles,
      parameters: currentColorRoles,
    })
}

function vaidateColorHexCode(colorHexCode) {
  return colorHexCode.match(`^#(?:[0-9a-fA-F]{3}){1,2}$`)
}

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, member, options } = interaction,
    { roles: guildRoles } = guild,
    { roles: memberRoles } = member,
    _colorHexCode = options.getString(`color-hex-code`),
    existingUserColor = guildRoles.cache.find(
      role => role.name === `<${member.id}>`
    )

  if (_colorHexCode === `null`) {
    await clearOtherColorRoles(member)

    if (existingUserColor) await existingUserColor.delete()

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `Your custom color has been cleared 🧼`,
    })

    return
  }

  const colorHexCode = _colorHexCode.match(`^#`)
      ? _colorHexCode
      : `#${_colorHexCode}`,
    isHexCode = vaidateColorHexCode(colorHexCode)

  if (!isHexCode) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `You provided an invalid hex code (ex: \`#4fa3ab\`, \`4fa3ab\`) 🤔`,
    })

    return
  }

  await clearOtherColorRoles(member)

  if (existingUserColor) {
    await queueApiCall({
      apiCall: `edit`,
      djsObject: existingUserColor,
      parameters: { color: colorHexCode },
    })
  } else {
    const userColorRole = await queueApiCall({
      apiCall: `create`,
      djsObject: guildRoles,
      parameters: {
        name: `<${member.id}>`,
        color: colorHexCode,
      },
    })

    await queueApiCall({
      apiCall: `add`,
      djsObject: memberRoles,
      parameters: userColorRole,
    })
  }

  const seconds = roleSortPauseDuration / 1000

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters:
      `Your custom color has been set 😁` +
      `\nThough, it may take up to ${seconds} seconds to apply 🕑`,
  })
}
