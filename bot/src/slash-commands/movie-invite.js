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

export const description = `Generates a movie invite with details displayed in an embed and a thread to discuss.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `movies`,
      description: `A comma delimited list of one or more imdb title ids.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `where`,
      description: `A comma delimited list of one or more locations.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `when`,
      description: `A comma delimited list of one or more date-times.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]

function formatMovie(movieDetails) {
  const { title, url } = movieDetails[0]

  return `[${title}](${url})`
}

function formatWhere(whereArray) {
  const where = whereArray[0],
    uriWhere = encodeURIComponent(where)

  return `[${where}](https://www.google.com/search?q=${uriWhere})`
}

export default async function (interaction) {
  const { options, channel } = interaction,
    channelIsThread = isChannelThread(channel)

  if (channelIsThread) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: '`/movie-invite` cannot be used in a thread 🤔',
        ephemeral: true,
      },
    })

    return
  }

  const movieUrls = options.getString(`movies`),
    when = options.getString(`when`),
    where = options.getString(`where`),
    commaMoviesUrls = movieUrls?.replaceAll(commasFollowedBySpace, `,`),
    movieUrlArray = commaMoviesUrls?.split(`,`),
    posters = [],
    movieDetails = await Promise.all(
      movieUrlArray.map(async movieUrl => {
        const movieId = getImdbMovieId(movieUrl)

        if (!movieId) return null

        const { Title: title, Poster: poster } = await fetch(
          `http://www.omdbapi.com/?i=${movieId}&apikey=${omdbKey}`
        ).then(response => response?.json())

        posters.push(poster)

        return { title: title, url: movieUrl }
      })
    )

  if (movieDetails.includes(null)) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: 'You provided invalid IMDb URLs 😡',
        ephemeral: true,
      },
    })

    return
  }

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
  })

  const commaWhen = when?.replaceAll(commasFollowedBySpace, `,`),
    commaWhere = where?.replaceAll(commasFollowedBySpace, `,`),
    whenArray = commaWhen?.split(`,`),
    whereArray = commaWhere?.split(`,`),
    movieField = movieDetails.length === 1 ? `movie` : `movies`,
    movies =
      movieDetails.length === 1
        ? formatMovie(movieDetails)
        : movieDetails
            .map((movieDetail, index) => {
              const position = index + 1,
                { title, url } = movieDetail

              return `${position}. [${title}](${url})`
            })
            .join(`\n`),
    _when =
      whenArray?.length === 1
        ? `${whenArray[0]}`
        : whenArray
            .map((when, index) => {
              const position = index + 1

              return `${position}. ${when}`
            })
            .join(`\n`),
    _where =
      whereArray?.length === 1
        ? formatWhere(whereArray)
        : whereArray
            .map((where, index) => {
              const position = index + 1,
                uriWhere = encodeURIComponent(where)

              return `${position}. [${where}](https://www.google.com/search?q=${uriWhere})`
            })
            .join(`\n`),
    attendees =
      movieDetails.length === 1
        ? `*none*`
        : movieDetails
            .map((movieDetails, index) => `${index + 1}. *none*`)
            .join(`\n`),
    image =
      posters?.length === 1
        ? posters[0]
        : `https://ia.media-imdb.com/images/M/MV5BMTczNjM0NDY0Ml5BMl5BcG5nXkFtZTgwMTk1MzQ2OTE@._V1_.png`,
    embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setThumbnail(`https://i.imgur.com/COFHnOZ.jpg`)
      .setTitle(`movie invite 🎟️`)
      .setDescription(
        `Press the button(s) below to let us know you're attending!`
      )
      .addFields(
        { name: movieField, value: movies },
        { name: `when`, value: _when },
        { name: `where`, value: _where },
        { name: `attendees`, value: attendees }
      )
      .setImage(image)
      .setTimestamp(),
    buttons = movieDetails.map((movieDetail, index) => {
      const { title } = movieDetail,
        button = new ButtonBuilder()
          .setCustomId(`!attend: ${index}`)
          .setLabel(`Attend ${title}`)
          .setStyle(ButtonStyle.Primary)

      return button
    }),
    rows = chunckButtons(buttons)

  const reply = await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        embeds: [embed],
        components: rows,
      },
    }),
    threadName = movieDetails
      .map(movieDetail => {
        return movieDetail?.title
      })
      .join(` | `)

  await createMovieInviteData(reply?.id)

  await queueApiCall({
    apiCall: `startThread`,
    djsObject: reply,
    parameters: { name: threadName },
  })
}
