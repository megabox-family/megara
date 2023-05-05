import { directMessageError } from '../utils/error-logging.js'
import { getColorButtons } from '../utils/buttons.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
  })

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
    await queueApiCall({
      apiCall: `send`,
      djsObject: member,
      parameters: `The color you've chosen no longer exists, please refresh the embed to get an updated list 😬`,
    })

    return
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

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      components: [message.components[0], ...colorButtonComponents],
    },
  })
}
