import { getRules } from '../repositories/guilds.js'
import {
  getFormatedCommandChannels,
  getCommandLevelForChannel,
} from '../repositories/channels.js'
import { getCommandSymbol } from '../repositories/guilds.js'

export const description = `Shows you the rules for this sever.`,
  dmPermission = false

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    rules = await getRules(guild.id)

  if (rules) await interaction.editReply({ content: rules })
  else {
    const channel = interaction.channel

    if ((await getCommandLevelForChannel(channel.id)) === `admin`) {
      const commandChannels = await getFormatedCommandChannels(
          guild.id,
          `admin`
        ),
        commandSymbol = await getCommandSymbol(guild.id)

      await interaction.editReply({
        content: `
          Sorry, rules have not been set for this server 😔\
          \nTo set rules, use the \`${commandSymbol}setRules\` command, example:\
          \n\`\`\`!setRules\
            \nTo continue you must accept [server name]'s rules\
            \n- No kicking\
            \n- No screamin\
          \n...\
          \n\`\`\`\
          \nThe \`!setRules\` command can be used in these channels: ${commandChannels}
        `,
      })
    } else
      await interaction.editReply({
        content: `Sorry, rules have not been set for this server 😔`,
      })
  }
}
