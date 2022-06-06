export const description = `Allows you to change your name's display color (use \`/color-list\` to get a color list).`
export const defaultPermission = false,
  options = [
    {
      name: `color-name`,
      description: `The color that you want to your name to display as (entering \`null\` removes color).`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    colorName = options.getString(`color-name`)

  let color

  if (colorName !== `null`) {
    const colors = guild.roles.cache
      .filter(role => role.name.match(`^~.+~$`))
      .map(role => {
        return {
          name: role.name.match(`(?!~).+(?=~)`)[0].toLowerCase(),
          id: role.id,
        }
      })

    color = colors.find(color => color.name === colorName)
  }

  const guildMember = interaction.member

  if (colorName === `null`) {
    guildMember.roles.cache.forEach(role => {
      if (role.name.match(`^~.+~$`)) guildMember.roles.remove(role.id)
    })

    interaction.reply({
      content: `All color roles have been removed from your user account 🧼`,
      ephemeral: true,
    })
  } else if (color) {
    const guildMember = interaction.member

    await guildMember.roles.add(color.id)

    guildMember.roles.cache.forEach(role => {
      if (role.name.match(`^~.+~$`) && role.id !== color.id)
        guildMember.roles.remove(role.id)
    })

    interaction.reply({
      content: `Your color has been set to \`${colorName}\` 🤗`,
      ephemeral: true,
    })
  } else
    interaction.reply({
      content: `\
        \n\`${colorName}\` is not a valid color 🤔\
        \nUse \`/color-list\` to get a list of valid colors.
      `,
      ephemeral: true,
    })
}
