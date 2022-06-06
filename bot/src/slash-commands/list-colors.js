export const description = `Displays a list of colors that you can choose from to change your name color.`,
  defaultPermission = false

export default async function (interaction) {
  const guild = interaction.guild

  interaction.reply({
    content: `
      \nYour wish is my command 🪄\
      \nUse the \`/set-color\` command to set your name's display color to one of these colors.
    `,
    files: [`/app/src/media/${guild.id}.png`],
    ephemeral: true,
  })
}
