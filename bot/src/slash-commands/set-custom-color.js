import { ApplicationCommandOptionType } from 'discord.js'
import { roleSortPauseDuration } from '../utils/roles.js'

export const description = `Allows you to change your name's display color using a hexcode.`
export const dmPermission = false,
  defaultMemberPermissions = 0,
  options = [
    {
      name: `color-hex-code`,
      description: `The hex code that represents the color you'd like your name to display as (input 'null' to clear).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

async function clearOtherColorRoles(member) {
  const currentColorRoles = []

  member.roles.cache.forEach(role => {
    if (role.name.match(`^~.+~$`)) {
      currentColorRoles.push(role)
    }
  })

  if (currentColorRoles.length > 0) await member.roles.remove(currentColorRoles)
}

function vaidateColorHexCode(colorHexCode) {
  return colorHexCode.match(`^#(?:[0-9a-fA-F]{3}){1,2}$`)
}

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    _colorHexCode = options.getString(`color-hex-code`),
    member = interaction.member,
    existingUserColor = guild.roles.cache.find(
      role => role.name === `<${member.id}>`
    )

  if (_colorHexCode === `null`) {
    await clearOtherColorRoles(member)

    if (existingUserColor) await existingUserColor.delete()

    await interaction.editReply(`Your custom color has been cleared 🧼`)

    return
  }

  const colorHexCode = _colorHexCode.match(`^#`)
      ? _colorHexCode
      : `#${_colorHexCode}`,
    isHexCode = vaidateColorHexCode(colorHexCode)

  if (!isHexCode) {
    await interaction.editReply({
      content: `Invlaid input, input must be a color hex code (ex: \`#4fa3ab\`, \`4fa3ab\`) 🤔`,
    })

    return
  }

  await clearOtherColorRoles(member)

  if (existingUserColor) {
    await existingUserColor.edit({
      color: colorHexCode,
    })
  } else {
    const userColorRole = await guild.roles.create({
      name: `<${member.id}>`,
      color: colorHexCode,
    })

    await member.roles.add(userColorRole)
  }

  const seconds = roleSortPauseDuration / 1000

  await interaction.editReply({
    content: `
      Your custom color has been set 😁\
      \nThough, it may take up to ${seconds} seconds to apply 🕑
    `,
  })
}
