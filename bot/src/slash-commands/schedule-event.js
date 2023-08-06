import config from '../../config.js'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import { srcPath } from '../utils/general.js'
import { checkIfUrlContainsImage, getImdbMovieId } from '../utils/validation.js'
import { isChannelThread } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'
import { addEvent } from '../repositories/events.js'

const { omdbKey } = config

export const description = `Creates an event message w/ a thread, allowing users to opt-into attendance, among other things.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `event-type`,
      description: `The type of the event you're scheduling.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `adventure`, value: `adventure` },
        { name: `cinema`, value: `cinema` },
        { name: `miscellaneous`, value: `new` },
      ],
    },
    {
      name: `when`,
      description: `When the event will occur (single date/time, or a range).`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `where`,
      description: `The location that best locates where the event will take place.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `allow-guests`,
      description: `Determines if attendees can choose to bring guests or not.`,
      type: ApplicationCommandOptionType.Boolean,
      required: true,
    },
    {
      name: `request-venmo`,
      description: `Determines if the attendee's venmo tag is requested when they mark as attending.`,
      type: ApplicationCommandOptionType.Boolean,
      required: true,
    },
    {
      name: `thread-name`,
      description: `Sets the name of the thread spawned under the event message.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `event-title-override`,
      description: `The name of the event you're scheduling, overrides default logic which is based on event type.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `activities`,
      description: `A comma delimited list of activities (ie: camping, hiking, swimming, gambling 😈, etc).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `image-url`,
      description: `The url to the image you'd like to display at the bottom of the embed (overrides imdb).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `imdb-url`,
      description: `The imdb url for the movie, provides a hyperlink for users, adds image to embed.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `notes`,
      description: `Custom notes regarding this event.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ]

export default async function (interaction) {
  const { options, channel, user } = interaction,
    channelIsThread = isChannelThread(channel)

  if (channelIsThread) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: '`/schedule-event` cannot be used in a thread 🤔',
        ephemeral: true,
      },
    })

    return
  }

  const imageUrl = options.getString(`image-url`),
    urlContainsImage = await checkIfUrlContainsImage(imageUrl)

  if (!urlContainsImage && imageUrl) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You provided an invalid image url, or I don't have access to the image 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const eventType = options.getString(`event-type`),
    imdbUrl = options.getString(`imdb-url`),
    imdbId = getImdbMovieId(imdbUrl),
    { Title: title, Poster: poster } =
      (await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`)
        .then(response => response?.json())
        .catch(error => null)) || {}

  if (eventType === `cinema` && !title) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: 'You provided an invalid IMDb id/url 😡',
        ephemeral: true,
      },
    })

    return
  }

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const when = options.getString(`when`),
    where = options.getString(`where`),
    allowGuests = options.getBoolean(`allow-guests`),
    requestVenmo = options.getBoolean(`request-venmo`),
    threadName = options.getString(`thread-name`),
    eventTitleOverride = options.getString(`event-title-override`),
    activities = options.getString(`activities`),
    notes = options.getString(`notes`)

  let eventTitle

  if (eventTitleOverride) eventTitle = eventTitleOverride
  else if (eventType === `adventure`) eventTitle = `${eventType} event 🏕️`
  else if (eventType === `cinema`) eventTitle = `${eventType} event 🍿`
  else eventTitle = `${eventType} event 🆕`

  const movieField = `[${title}](<${imdbUrl}>)`,
    uriWhere = encodeURIComponent(where),
    _where = `[${where}](<https://www.google.com/search?q=${uriWhere}>)`

  const fields = [
    { name: `when`, value: when },
    { name: `where`, value: _where },
  ]

  if (activities) fields.unshift({ name: `activities`, value: activities })
  if (title) fields.unshift({ name: `movie`, value: movieField })
  if (notes) fields.push({ name: `notes`, value: notes })

  const embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setThumbnail(`attachment://${eventType}.jpg`)
      .setTitle(eventTitle)
      .setDescription(
        `Press the attend button below to let us know you're attending!`
      )
      .addFields(fields)
      .setTimestamp(),
    attendButton = new ButtonBuilder()
      .setCustomId(`!attend:`)
      .setLabel(`attend`)
      .setStyle(ButtonStyle.Primary),
    modifyAttendanceButton = new ButtonBuilder()
      .setCustomId(`!modify-attendance:`)
      .setLabel(`modify attendance`)
      .setStyle(ButtonStyle.Primary),
    viewAttendees = new ButtonBuilder()
      .setCustomId(`!view-attendees:`)
      .setLabel(`view attendees`)
      .setStyle(ButtonStyle.Secondary),
    actionRow = new ActionRowBuilder().addComponents(
      attendButton,
      modifyAttendanceButton,
      viewAttendees
    )

  let image

  if (poster) image = poster
  else if (imageUrl) image = imageUrl

  if (image) embed.setImage(image)

  const thumbnail = new AttachmentBuilder(`${srcPath}/media/${eventType}.jpg`)

  const replyMessage = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      embeds: [embed],
      components: [actionRow],
      files: [thumbnail],
    },
  })

  await addEvent(replyMessage.id, user.id, allowGuests, requestVenmo)

  await queueApiCall({
    apiCall: `startThread`,
    djsObject: replyMessage,
    parameters: { name: threadName },
  })
}
