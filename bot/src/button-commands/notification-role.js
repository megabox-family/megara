import { directMessageError } from '../utils/error-logging.js'
import { getNotificationButtons } from '../utils/buttons.js'
import { getButtonContext } from '../utils/validation.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const guild = interaction.guild,
    member = interaction.member,
    roleNumber = getButtonContext(interaction.customId),
    message = interaction.message,
    embed = message.embeds[0],
    listValue = embed.fields[0].value,
    listValueArray = listValue.split(`\n`),
    desiredRoleId = listValueArray
      .find(value => value.match(`[0-9]+(?=\\.)`)[0] === roleNumber)
      .match(`(?<=&)[0-9]+`)[0],
    desiredRole = guild.roles.cache.get(desiredRoleId)

  if (!desiredRole) {
    member
      .send({
        content: `The notification role you've chosen no longer exists, please refresh the embed to get an updated list 😬`,
      })
      .catch(error => directMessageError(error, member))

    return
  }

  const override = { roleId: desiredRoleId }

  if (!member._roles.includes(desiredRoleId)) {
    override.removed = false

    await member.roles
      .add(desiredRole)
      .catch(`Unable to set notification role.`)
  } else {
    override.removed = true

    await member.roles
      .remove(desiredRole)
      .catch(`Unable to set notification role.`)
  }

  const page = embed.fields,
    colorButtonComponents = getNotificationButtons(
      page,
      member._roles,
      override
    )

  await interaction.editReply({
    components: [message.components[0], ...colorButtonComponents],
  })
}
