import { setNameGuidelines, getNameGuidelines } from '../repositories/guilds.js'

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    fields = interaction.fields,
    newNameGuidelines = fields.getTextInputValue('name-guidelines-input')

  await setNameGuidelines(guild.id, newNameGuidelines)

  const nameGuidelines = await getNameGuidelines(guild.id)

  await interaction.editReply({
    content: `
      You've set **${guild}'s** name guidelines to the below:\
      \n>>> ${nameGuidelines}
    `,
  })
}
