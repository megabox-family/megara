import { validCommandSymbols } from '../utils/general.js'
import {
  setCommandSymbol,
  getAnnouncementChannel,
} from '../repositories/guilds.js'

const symbolObjectArray = []

validCommandSymbols.forEach(symbol => {
  symbolObjectArray.push({
    name: symbol,
    value: symbol,
  })
})

export const description = `Lets you set the command symbol for commands that are not slash commands.`,
  dmPermission = false,
  options = [
    {
      name: `command-symbol`,
      description: `The command symbol you want to use for text commands (non-slash commands).`,
      type: `STRING`,
      required: true,
      choices: symbolObjectArray,
    },
  ]

export default async function (interaction) {
  await interaction.deferReply({ ephemeral: true })

  const guild = interaction.guild,
    options = interaction.options,
    commandSymbol = options.getString(`command-symbol`)

  await setCommandSymbol(guild.id, commandSymbol)

  await interaction.editReply({
    content: `\`${commandSymbol}\` has been set as the new command symbol for commands that are not slash commands!`,
  })
}
