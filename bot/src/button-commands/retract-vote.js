import { ActionRowBuilder } from 'discord.js'
import moment from 'moment/moment.js'
import { deletePollData } from '../repositories/poll-data.js'
import { getPollEndTime } from '../repositories/polls.js'
import { getPollSelectPicker } from '../utils/general-commands.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const message = interaction.message,
    channel = interaction.channel,
    pollMessage = await channel.messages.fetch(message.reference?.messageId),
    endTime = await getPollEndTime(pollMessage.id),
    currentTime = moment().unix()

  if (endTime <= currentTime) {
    await interaction.editReply({
      content: `This poll has ended, you can't retract your vote 🤔`,
      components: [],
    })

    return
  }

  const user = interaction.user,
    pollId = interaction.customId.match(`(?!:)[0-9]+`)[0],
    selectPicker = await getPollSelectPicker(pollId),
    firstRow = new ActionRowBuilder().addComponents(selectPicker)

  await deletePollData(user.id, pollId)

  await interaction.editReply({
    content: `Your vote has been retracted, feel free to place a new vote 👍`,
    embeds: [],
    components: [firstRow],
  })
}
