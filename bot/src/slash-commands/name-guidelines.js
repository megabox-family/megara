import { getNameGuidelines } from '../repositories/guilds.js'
import {
  getFormatedCommandChannels,
  getCommandLevelForChannel,
} from '../repositories/channels.js'
import { getCommandSymbol } from '../repositories/guilds.js'

export const description = `Shows you the name guidelines for this sever.`,
  dmPermission = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    nameGuidelines = await getNameGuidelines(guild.id)

  if (nameGuidelines)
    await interaction.editReply({ content: nameGuidelines, ephemeral: true })
  else {
    if ((await getCommandLevelForChannel(interaction.channel.id)) === `admin`) {
      const commandChannels = await getFormatedCommandChannels(
          guild.id,
          `admin`
        ),
        commandSymbol = await getCommandSymbol(guild.id)

      await interaction.editReply({
        content: `
          Sorry, name guidelines have not been set for this server 😔\
          \nTo set name guidelines, use the \`${commandSymbol}setNameGuidelines\` command, example:\
          \nExample:\
          \n\`\`\`${commandSymbol}setNameGuidelines\
            \nWe recommend setting your nickname to what people call you in real life.\
            \nwe're all on a first name basis in this server.\
          \n\`\`\`\
          \nThe \`${commandSymbol}setNameGuidelines\` command can be used in these channels: ${commandChannels}
        `,
        ephemeral: true,
      })
    } else
      await interaction.editReply({
        content: `Sorry, name guidelines have not been set for this server 😔`,
        ephemeral: true,
      })
  }
}
