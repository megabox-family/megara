import { queueApiCall } from '../api-queue.js'
import { getAdminChannel } from '../repositories/guilds.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

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
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters:
        `The admins of this server have something misconfigured, I am unable to submit your channel request.` +
        `Please contact an adminstrator or ask for help in a support channel for further assistance.`,
    })

    return
  }

  await queueApiCall({
    apiCall: `send`,
    djsObject: adminChannel,
    parameters:
      `${member} has requested a private channel named **${channelName}** be created, here's what else they had to say:` +
      `\n>>> ${additionalInformation}`,
  })

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `Your request to create a private channel named **${channelName}** has been submitted, you should hear back from an administrator shortly.`,
  })
}
