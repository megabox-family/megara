export const description = `You can no longer join channels using this command, please use \`/channel-list\` instead.`
export const defaultPermission = false

export default async function (interaction) {
  await interaction.reply({
    content: `You can no longer join channels using the \`/join\` command, please use the \`/channel-list\` command instead.`,
    ephemeral: true,
  })
}
