import { getAdminChannel } from '../repositories/guilds.js'

export default async function (interaction) {
  const guild = interaction.guild,
    member = interaction.member,
    fields = interaction.fields,
    channelName = fields.getTextInputValue('channel-name').toLowerCase(),
    additionalInformation = fields.getTextInputValue('additional-information'),
    adminChannelId = await getAdminChannel(guild.id),
    adminChannel = adminChannelId
      ? guild.channels.cache.get(adminChannelId)
      : null

  if (!adminChannel) {
    interaction.reply(`
      The admins of this server have something misconfigured, I am unable to submit your channel request.\
      \nPlease contact an adminstrator or ask for help in a support channel for further assitence.
    `)
  }

  adminChannel.send(`
    ${member} has requested a private channel named **${channelName}** be created, here's what else they had to say:\
    \n>>> ${additionalInformation}
  `)

  interaction.reply({
    content: `Your request to create a private channel named **${channelName}** has been submitted, you should hear back from an administrator shortly.`,
    ephemeral: true,
  })
}
