// /schedule-event event-type:cinema start-datetime:10/04/23 19:35 where:Ogden Megaplex allow-guests:True request-venmo:True imdb-url:https://www.imdb.com/title/tt21807222/?ref_=nv_sr_srsg_1_tt_7_nm_0_q_saw image-url:https://dx35vtwkllhj9.cloudfront.net/lionsgateus/saw-x/images/regions/us/share.png

import config from '../../config.js'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import moment from 'moment-timezone'
import { convertSecondsToDurationString, srcPath } from '../utils/general.js'
import {
  checkIfUrlContainsImage,
  extractFirstNumber,
  getImdbMovieId,
  validateDatetime,
} from '../utils/validation.js'
import { isChannelThread } from '../utils/channels.js'
import { queueApiCall } from '../api-queue.js'
import { addEvent, setConcluded } from '../repositories/events.js'
import { getThreadById } from '../utils/threads.js'
import { getBot } from '../cache-bot.js'
import { twentyFourHours } from '../handlers/general.js'
import { timoutMap } from '../utils/general-commands.js'

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
      name: `start-datetime`,
      description: `Event start date & time [mm/dd/yy hh:mm 24hr|12hr] (ie 9/29/23 19:30, 9/29/23 7:30pm).`,
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
      name: `end-datetime`,
      description: `Event end date & time [mm/dd/yy hh:mm 24hr|12hr] (ie 9/29/23 19:30, 9/29/23 7:30pm).`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `thread-name`,
      description: `Sets the name of the thread/post spawned for this event.`,
      type: ApplicationCommandOptionType.String,
      required: false,
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
      name: `account-for-trailers`,
      description: `Adds 20 minutes to the event duration to account for trailers. (default is true)`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `notes`,
      description: `Custom notes regarding this event.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ]

export async function concludeEvent(parentId, messageId) {
  await setConcluded(messageId)

  const bot = getBot(),
    parent = bot.channels.cache.get(parentId),
    isParentForum = parent?.type === ChannelType.GuildForum

  if (!isParentForum) return

  const thread = await getThreadById(parent, messageId)

  if (!thread) return

  const eventTag = parent.availableTags.find(tag => tag.name === `event`),
    concludedTag = parent.availableTags.find(tag => tag.name === `concluded`),
    tagIdSet = new Set(thread.appliedTags)

  if (eventTag) tagIdSet.delete(eventTag.id)

  const newTags = [...tagIdSet]

  if (concludedTag) newTags.unshift(concludedTag.id)

  await queueApiCall({
    apiCall: `edit`,
    djsObject: thread,
    parameters: { appliedTags: newTags },
  })
}

export default async function (interaction) {
  const { guild, options, channel, user } = interaction,
    parent = guild.channels.cache.get(channel.parentId),
    channelIsThread = isChannelThread(channel),
    parentIsForum = parent?.type === ChannelType.GuildForum,
    channelIsText = channel?.type === ChannelType.GuildText,
    channelIsPinned = channel.flags.serialize().Pinned

  if (channelIsThread && !parentIsForum) {
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
    {
      Title: title,
      Poster: poster,
      Runtime: runtime,
    } = (await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`)
      .then(response => response?.json())
      .catch(error => null)) || {}

  if (eventType === `cinema` && !title) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content:
          'You either provided an invalid IMDb id/url or the movie has no title attribute 🤔',
        ephemeral: true,
      },
    })

    return
  }

  let threadName = options.getString(`thread-name`)

  if (!threadName && eventType !== `cinema`) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You can't schedule a non-cinema event in a scheduler post / text channel without providing a thread name 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  // time junk ---------------------------------------------------------------
  const startDateTime = options.getString(`start-datetime`),
    startDateValidationResponse = validateDatetime(startDateTime)

  if (!startDateValidationResponse.isValid) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: interaction,
      parameters: {
        content: `You provided an invalid **start datetime**, format must be \`mm/dd/yy hh:mm (24hr or am/pm)\` (ie \`9/29/23 7:30pm\`, \`9/29/23 19:30\`) 🤔`,
        ephemeral: true,
      },
    })

    return
  }

  const endDateTime = options.getString(`end-datetime`),
    endDateValidationResponse = {}

  if (endDateTime) {
    const _endDateValidationResponse = validateDatetime(endDateTime)

    Object.keys(_endDateValidationResponse).forEach(key => {
      endDateValidationResponse[key] = _endDateValidationResponse[key]
    })

    if (!endDateValidationResponse.isValid) {
      await queueApiCall({
        apiCall: `reply`,
        djsObject: interaction,
        parameters: {
          content: `You provided an invalid **end datetime**, format must be \`mm/dd/yy hh:mm (24hr or am/pm)\` (ie \`9/29/23 7:30pm\`, \`9/29/23 19:30\`) 🤔`,
          ephemeral: true,
        },
      })

      return
    } else if (
      endDateValidationResponse.datetime.isSameOrBefore(
        startDateValidationResponse.datetime
      )
    ) {
      await queueApiCall({
        apiCall: `reply`,
        djsObject: interaction,
        parameters: {
          content: `The **end datetime** must be after the **start datetime** 🤔`,
          ephemeral: true,
        },
      })

      return
    }
  } else {
    if (eventType !== `cinema`) {
      await queueApiCall({
        apiCall: `reply`,
        djsObject: interaction,
        parameters: {
          content: `You must provide an **end datetime** for non-cinema events 🤔`,
          ephemeral: true,
        },
      })

      return
    }

    const _runtime = extractFirstNumber(runtime)

    if (_runtime) {
      let accountForTrailers = options.getBoolean(`account-for-trailers`)

      if (accountForTrailers === null) accountForTrailers = true

      let _endDateTime = startDateValidationResponse.datetime.clone()

      if (accountForTrailers)
        _endDateTime = _endDateTime.add(_runtime * 1 + 20, `minutes`)
      else _endDateTime = _endDateTime.add(_runtime * 1, `minutes`)

      const roundedToNearest5Minutes =
        Math.ceil(moment(_endDateTime).minute() / 5) * 5

      _endDateTime.minute(roundedToNearest5Minutes).second(0).millisecond(0)

      endDateValidationResponse.isValid = true
      endDateValidationResponse.datetime = _endDateTime
    }
  }
  // ---------------------------------------------------------------

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: parentIsForum && channelIsPinned,
    },
  })

  const startUnix = startDateValidationResponse.datetime.unix(),
    endUnix = endDateValidationResponse.datetime.unix(),
    difference = endUnix - startUnix,
    durationString = convertSecondsToDurationString(difference),
    where = options.getString(`where`),
    allowGuests = options.getBoolean(`allow-guests`),
    requestVenmo = options.getBoolean(`request-venmo`),
    eventTitleOverride = options.getString(`event-title-override`),
    activities = options.getString(`activities`),
    notes = options.getString(`notes`)

  let eventTitle

  if (eventTitleOverride) eventTitle = eventTitleOverride
  else if (eventType === `adventure`) eventTitle = `${eventType} event 🏕️`
  else if (eventType === `cinema`) eventTitle = `${eventType} event 🍿`
  else eventTitle = `${eventType} event 🆕`

  const movieField = `[${title}](<${imdbUrl}>)`
  //   when = [`start - <t:${startUnix}:F>\n(<t:${startUnix}:R>)`]

  // if (endUnix) {
  //   when.push(`end - <t:${endUnix}:F>`)
  //   when.push(`duration - ${durationString}`)
  // }

  const uriWhere = encodeURIComponent(where),
    _where = `[${where}](<https://www.google.com/search?q=${uriWhere}>)`,
    fields = [
      { name: `start`, value: `<t:${startUnix}:F>\n(<t:${startUnix}:R>)` },
      { name: `end`, value: `<t:${endUnix}:F>\n(<t:${startUnix}:R>)` },
      { name: `duration`, value: durationString },
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

  if (!threadName) threadName = title

  let image

  if (imageUrl) image = imageUrl
  else if (poster) image = poster

  if (image) embed.setImage(image)

  const thumbnail = new AttachmentBuilder(`${srcPath}/media/${eventType}.jpg`)

  if (parentIsForum && channelIsPinned) {
    const tags = [],
      eventTag = parent.availableTags.find(tag => tag.name === `event`)

    if (eventTag) tags.push(eventTag.id)

    if (eventType === `cinema`) {
      const spoilerTag = parent.availableTags.find(
        tag => tag.name === `spoilers`
      )

      if (spoilerTag) tags.push(spoilerTag.id)
    }

    const thread = await queueApiCall({
      apiCall: `create`,
      djsObject: parent.threads,
      parameters: {
        name: threadName,
        type: ChannelType.PublicThread,
        message: {
          embeds: [embed],
          components: [actionRow],
          files: [thumbnail],
        },
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        appliedTags: tags,
      },
    })

    await addEvent(
      thread.id,
      user.id,
      allowGuests,
      requestVenmo,
      parent.id,
      startUnix,
      endUnix,
      true
    )

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The requested event has been scheduled → ${thread} 🙌`,
    })

    const millisecondDifference = endUnix * 1000 - Date.now()

    if (millisecondDifference > twentyFourHours) return

    const timeoutId = setTimeout(
      concludeEvent.bind(null, parent.id, thread.id),
      millisecondDifference
    )

    timoutMap.set(thread.id, timeoutId)

    return
  }

  const replyMessage = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      embeds: [embed],
      components: [actionRow],
      files: [thumbnail],
    },
  })

  await addEvent(
    replyMessage.id,
    user.id,
    allowGuests,
    requestVenmo,
    parent.id,
    startUnix,
    endUnix
  )

  if (!parentIsForum)
    await queueApiCall({
      apiCall: `startThread`,
      djsObject: replyMessage,
      parameters: { name: threadName },
    })
}

// concluded
