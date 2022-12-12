import { EmbedBuilder } from 'discord.js'

export function buildVoterEmbed(userName, choices) {
  const formattedChoices = choices.map(
    (choice, index) => `${index + 1}. ${choice}`
  )

  return new EmbedBuilder()
    .setColor('#CF2C2C')
    .setTitle(`${userName}'s ballot`)
    .addFields({ name: `Choices:`, value: formattedChoices.join(`\n`) })
}
