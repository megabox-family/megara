import { ActionRowBuilder } from 'discord.js'
import moment from 'moment/moment.js'
import { deletePollData } from '../repositories/poll-data.js'
import { getPollEndTime } from '../repositories/polls.js'
import { getPollSelectPicker } from '../utils/general-commands.js'
import { queueApiCall } from '../api-queue.js'

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferUpdate`,
    djsObject: interaction,
  })

  const message = interaction.message,
    channel = interaction.channel,
    pollMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: channel.messages,
      parameters: message.reference?.messageId,
    }),
    endTime = await getPollEndTime(pollMessage.id),
    currentTime = moment().unix()

  if (endTime <= currentTime) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `This poll has ended, you can't retract your vote 🤔`,
        components: [],
      },
    })

    return
  }

  const user = interaction.user,
    pollId = interaction.customId.match(`(?!:)[0-9]+`)[0],
    selectPicker = await getPollSelectPicker(pollId),
    firstRow = new ActionRowBuilder().addComponents(selectPicker)

  await deletePollData(user.id, pollId)

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: `Your vote has been retracted, feel free to place a new vote 👍`,
      embeds: [],
      components: [firstRow],
    },
  })
}
