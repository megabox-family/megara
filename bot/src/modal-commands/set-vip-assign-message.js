import {
  setVipAssignMessage,
  getVipAssignMessage,
} from '../repositories/guilds.js'

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    fields = interaction.fields,
    newVipAssignMessage = fields.getTextInputValue('vip-assign-message-input')

  await setVipAssignMessage(guild.id, newVipAssignMessage)

  const vipAssignMessage = await getVipAssignMessage(guild.id)

  await interaction.editReply({
    content: `You've set **${guild}'s** vip assign message to the below: \n>>> ${vipAssignMessage}`,
  })
}
