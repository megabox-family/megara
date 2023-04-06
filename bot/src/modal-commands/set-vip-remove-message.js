import {
  setVipRemoveMessage,
  getVipRemoveMessage,
} from '../repositories/guilds.js'

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    fields = interaction.fields,
    newVipRemoveMessage = fields.getTextInputValue('vip-remove-message-input')

  await setVipRemoveMessage(guild.id, newVipRemoveMessage)

  const vipRemoveMessage = await getVipRemoveMessage(guild.id)

  await interaction.editReply({
    content: `You've set **${guild}'s** vip remove message to the below: \n>>> ${vipRemoveMessage}`,
  })
}
