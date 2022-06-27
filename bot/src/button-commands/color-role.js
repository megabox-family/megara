import { getColorButtons } from '../utils/buttons.js'

export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    colorNumber = interaction.customId.match(`(?<=:\\s)-?[0-9A-Za-z]+`)[0],
    message = interaction.message,
    embed = message.embeds[0],
    listValue = embed.fields[0].value,
    listValueArray = listValue.split(`\n`),
    desiredColorId = listValueArray
      .find(value => value.match(`[0-9]+(?=\\.)`)[0] === colorNumber)
      .match(`(?<=&)[0-9]+`)[0],
    desiredColorRole = guild.roles.cache.get(desiredColorId)

  if (!desiredColorRole) {
    interaction.reply({
      content: `The color you've chosen no longer exists, please refresh the embed to get an updated list 😬`,
      ephemeral: true,
    })
  }

  const currentColorRoles = []

  let alreadyHas = false

  member.roles.cache.forEach(role => {
    if (role.name.match(`^~.+~$`)) {
      currentColorRoles.push(role)

      if (role.id === desiredColorId) alreadyHas = true
    } else if (role.name.match(`^<.+>$`)) role.delete()
  })

  if (currentColorRoles.length > 0) await member.roles.remove(currentColorRoles)

  if (!member._roles.includes(desiredColorId) && !alreadyHas) {
    await member.roles.add(desiredColorRole).catch(`Unable to set color role.`)
  }

  const page = embed.fields,
    colorButtonComponents = getColorButtons(page, member._roles, {
      roleId: desiredColorId,
      remove: alreadyHas,
    })

  interaction.update({
    components: [message.components[0], ...colorButtonComponents],
  })
}
