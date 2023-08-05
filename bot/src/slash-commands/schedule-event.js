import config from '../../config.js'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import { commasFollowedBySpace, getImdbMovieId } from '../utils/validation.js'
import { chunckButtons } from '../utils/buttons.js'
import { createMovieInviteData } from '../repositories/movie-invites.js'
import { isChannelThread } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'

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
        { name: `other`, value: `other` },
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
      name: `activies`,
      description: `A comma delimited list of activities (ie: camping, hiking, swimming, gambling 😈, etc).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `imdb-url`,
      description: `The imdb url for the movie.`,
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
  const { options, channel } = interaction,
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

  const eventType = options.getString(`event-type`),
    when = options.getString(`when`),
    where = options.getString(`where`),
    activities = options.getString(`activities`),
    imdbUrl = options.getString(`imdb-url`),
    notes = options.getString(`notes`),
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

  console.log(title)

  await queueApiCall({
    apiCall: `reply`,
    djsObject: interaction,
    parameters: {
      content: 'Made it 😇',
      ephemeral: true,
    },
  })
}
