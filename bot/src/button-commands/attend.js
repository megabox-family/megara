import { EmbedBuilder } from 'discord.js'
import moment from 'moment'
import {
  editMovieInviteData,
  getMovieInviteLastUpdated,
} from '../repositories/movie-invites.js'
import {
  commasFollowedBySpace,
  extractAttendees,
  getButtonContext,
} from '../utils/validation.js'
import { queueApiCall } from '../api-queue.js'

function formatAttendees(attendeeArrays) {
  const attendeeArray = attendeeArrays[0],
    attendeeString =
      attendeeArray.length === 0 ? `*none*` : attendeeArray.join(`, `)

  return attendeeString
}

export default async function (interaction) {
  const { channel, message, customId, user } = interaction,
    { id: messageId, embeds, thread } = message

  let timestamp = moment().valueOf()

  await editMovieInviteData(messageId, timestamp)

  const { id: userId } = user

  let embed = embeds?.[0],
    newEmbed,
    attending = true

  if (!embed) {
    interaction.reply({
      content: `There was a problem recording your attendence 😬`,
      ephemeral: true,
    })
  }

  await interaction.deferUpdate()

  while (true) {
    const { fields } = embed,
      attendeesFieldArray = fields
        ?.find(field => field?.name === `attendees`)
        ?.value?.split(`\n`),
      attendeeArrays = attendeesFieldArray.map((attendees, index) => {
        const position = index + 1

        let existingAttendess = []

        if (!attendees.match(`\\*none\\*`)) {
          const attendeeText =
              attendeesFieldArray?.length === 1
                ? attendees
                : extractAttendees(attendees),
            formattedAttendeeText = attendeeText?.replaceAll(
              commasFollowedBySpace,
              `,`
            )

          existingAttendess.push(...formattedAttendeeText?.split(`,`))
        }

        return existingAttendess
      })

    const movieIndex = getButtonContext(customId) * 1,
      newAttendeeArrays = attendeeArrays.map((attendeeArray, index) => {
        if (index === movieIndex) {
          const userIdMarkdown = `<@${userId}>`

          if (attendeeArray?.length === 0) attendeeArray.push(userIdMarkdown)
          else {
            const attendeeSet = new Set(attendeeArray)

            if (attendeeSet?.has(userIdMarkdown)) {
              attendeeSet.delete(userIdMarkdown)

              attending = false
            } else attendeeSet.add(userIdMarkdown)

            attendeeArray = [...attendeeSet].sort()
          }
        }

        return attendeeArray
      }),
      attendeesFieldValue =
        newAttendeeArrays?.length === 1
          ? formatAttendees(newAttendeeArrays)
          : newAttendeeArrays
              .map((newAttendeeArray, index) => {
                const position = index + 1,
                  attendeeString =
                    newAttendeeArray.length === 0
                      ? `*none*`
                      : newAttendeeArray.join(`, `)

                return `${position}. ${attendeeString}`
              })
              .join(`\n`),
      embedFieldsLength = fields?.length,
      oldFields = fields.splice(0, embedFieldsLength - 1),
      attendeeField = {
        name: `attendees`,
        value: attendeesFieldValue,
      }

    const { color, thumbnail, title, image, description } = embed

    newEmbed = new EmbedBuilder()
      .setColor(color)
      .setThumbnail(thumbnail?.url)
      .setTitle(title)
      .setDescription(description)
      .addFields(...oldFields, attendeeField)
      .setImage(image?.url)
      .setTimestamp()

    const lastUpdated = await getMovieInviteLastUpdated(messageId)

    if (lastUpdated <= timestamp) break
    else {
      await new Promise(resolution => setTimeout(resolution, 1000))

      const updatedMessage = await channel.messages.fetch(messageId)

      embed = updatedMessage?.embeds?.[0]

      timestamp = moment().valueOf()
      await editMovieInviteData(messageId, timestamp)
    }
  }

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { embeds: [newEmbed] },
  })

  if (attending) await thread?.members?.add(userId)
  else await thread?.members?.remove(userId)
}
