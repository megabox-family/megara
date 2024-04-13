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
import { convertSecondsToDurationString, srcPath } from '../utils/general.js'
import { queueApiCall } from '../api-queue.js'
import { addEvent, setConcluded } from '../repositories/events.js'
import { getThreadById } from '../utils/threads.js'
import { getBot } from '../cache-bot.js'
import { twentyFourHours } from '../handlers/general.js'
import { timoutMap } from '../utils/general-commands.js'
import ScheduleEventGaurdClauses from '../guard-clauses/schedule-event.js'

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
      name: `location`,
      description: `The location at which the event will take place.`,
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
      description: `Adds 20 minutes to the event duration to account for trailers. (default = true for cinema events)`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `screen`,
      description: `The screen number at which the event will take place. (default = tbd`,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: `seats`,
      description: `The range of seats you have reserved for this event. (default = tbd)`,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: `hide-screen`,
      description: `Hides the screen field (default = false for cinema events).`,
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: `hide-seats`,
      description: `Hides the seats field (default = false for cinema events).`,
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: `notes`,
      description: `Custom notes regarding this event.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ]

export function getEventTitle({ eventType, eventTitleOverride }) {
  let eventTitle

  if (eventTitleOverride) eventTitle = eventTitleOverride
  else if (eventType === `adventure`) eventTitle = `${eventType} event 🏕️`
  else if (eventType === `cinema`) eventTitle = `${eventType} event 🍿`
  else eventTitle = `${eventType} event 🆕`

  return eventTitle
}

export function buildEventEmbed({ 
  eventTitle, 
  startUnix, 
  endUnix, 
  eventType, 
  imdbUrl, 
  title, 
  location, 
  activities,
  screen,
  seats,
  hideScreen,
  hideSeats,
  notes,
  imageUrl,
  poster
}) {
    const difference = endUnix - startUnix,
    durationString = convertSecondsToDurationString(difference)

  const movieField = `[${title}](<${imdbUrl}>)`,
    uriLocation = encodeURIComponent(location),
    _location = `[${location}](<https://www.google.com/search?q=${uriLocation}>)`,
    fields = [
      { name: `start`, value: `<t:${startUnix}:F>\n(<t:${startUnix}:R>)`},
      { name: `end`, value: `<t:${endUnix}:F>\n(<t:${endUnix}:R>)`},
      { name: `duration`, value: durationString},
      { name: `location`, value: _location, inline: true},
    ]

  if (activities) fields.unshift({ name: `activities`, value: activities })
  if (title) fields.unshift({ name: `movie`, value: movieField })

  if (!hideScreen) fields.push({ name: `screen`, value: screen, inline: true })
  if (!hideSeats) fields.push({ name: `seats`, value: seats, inline: true})
  if (notes) fields.push({ name: `notes`, value: notes })

  const embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setThumbnail(`attachment://${eventType}.jpg`)
      .setTitle(eventTitle)
      .setDescription(
        `Press the attend button below to let us know you're attending!`
      )
      .addFields(fields)
      .setTimestamp()

  let image

  if (imageUrl) image = imageUrl
  else if (poster) image = poster

  if (image) embed.setImage(image)

  return embed
}

export function getEventActionRow(){
  const attendButton = new ButtonBuilder()
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

  return actionRow
}

export function getThumbnail(eventType) {
  return new AttachmentBuilder(`${srcPath}/media/${eventType}.jpg`)
}

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
    parameters: {
      appliedTags: newTags,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    },
  })
}

export async function getMessageContent({ eventType, user }) {
  const indefiniteArticle = eventType === `cinema` ? `a` : `an`,
  messageContent = `${user} has scheduled ${indefiniteArticle} **${eventType}** event!`

  return messageContent
}

async function generateForumPost({ interaction, parent, eventType, messageContent, embed, actionRow, thumbnail, threadName, endUnix }) {
  const tags = [],
    eventTag = parent.availableTags.find(tag => tag.name === `event`)

  if (eventTag) tags.push(eventTag.id)

  if (eventType === `cinema`) {
    const spoilerTag = parent.availableTags.find(
      tag => tag.name === `spoilers`
    )

    if (spoilerTag) tags.push(spoilerTag.id)
  }

  const forumPost = await queueApiCall({
    apiCall: `create`,
    djsObject: parent.threads,
    parameters: {
      name: threadName,
      type: ChannelType.PublicThread,
      message: {
        content: messageContent,
        embeds: [embed],
        components: [actionRow],
        files: [thumbnail],
      },
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      appliedTags: tags,
    },
  })

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: `The requested event has been scheduled → ${forumPost} 🙌`,
  })

  const millisecondDifference = endUnix * 1000 - Date.now()

  if (millisecondDifference > twentyFourHours || timoutMap.has(forumPost.id))
    return

  const timeoutId = setTimeout(
    concludeEvent.bind(null, parent.id, forumPost.id),
    millisecondDifference
  )

  timoutMap.set(forumPost.id, timeoutId)

  return forumPost
}

async function generateMessage({ interaction, messageContent, embed, actionRow, thumbnail }) {
  const replyMessage = await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: {
      content: messageContent,
      embeds: [embed],
      components: [actionRow],
      files: [thumbnail],
    },
  })

  return replyMessage
}

async function startThread({ message, parentIsForum, threadName }) {
  if (parentIsForum) return

  await queueApiCall({
    apiCall: `startThread`,
    djsObject: message,
    parameters: { name: threadName },
  })
}

async function generateEventMessage({ 
  messageContent,
  interaction, 
  parent, 
  eventType, 
  parentIsForum, 
  channelIsPinned, 
  embed,
  actionRow, 
  thumbnail, 
  threadName, 
  endUnix 
}) {
  let message

  if (parentIsForum && channelIsPinned) 
    message = await generateForumPost({ 
      interaction, 
      parent, 
      eventType, 
      messageContent, 
      embed, 
      actionRow, 
      thumbnail, 
      threadName, 
      endUnix 
    })
  else message = await generateMessage({ interaction, messageContent, embed, actionRow, thumbnail })

  await startThread({ message, parentIsForum, threadName })

  return message
}

export default async function (interaction) {
  const scheduleEventGaurdClauses = new ScheduleEventGaurdClauses(interaction),
    { user, channel, parent } = scheduleEventGaurdClauses

  if (!(await scheduleEventGaurdClauses.checkIfChannelIsCompatible())) return
  if (!(await scheduleEventGaurdClauses.checkIfImageUrlIsValid())) return

  const { 
    parentIsForum,
    eventType, 
    startDatetime,
    location,
    allowGuests,
    requestVenmo,
    endDatetime,
    eventTitleOverride,
    activities,
    imageUrl, 
    imdbUrl, 
    accountForTrailers,
    screen,
    seats,
    hideScreen,
    hideSeats,
    notes
  } = scheduleEventGaurdClauses

  if (imdbUrl) {
    const imdbUrlIsValid = await scheduleEventGaurdClauses.checkIfImbdUrlIsValidAndStoreDetails()

    if (!imdbUrlIsValid) return
  }

  const { imdbDetails, threadName } = scheduleEventGaurdClauses

  if (!(await scheduleEventGaurdClauses.verifyThatThreadNameIsSetIfEventTypeIsNotCinema())) return 
  if (!(await scheduleEventGaurdClauses.checkIfStartDateTimeIsValidAndComputeStartDatetime())) return 
  if (!(await scheduleEventGaurdClauses.checkIfEndDateTimeIsValidAndComputeEndDatetime())) return

  const { computedStartDatetime, computedEndDatetime } = scheduleEventGaurdClauses,
    channelIsPinned = channel.flags.serialize().Pinned

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: parentIsForum && channelIsPinned,
    },
  })

  const messageContent = await getMessageContent({ eventType, user }),
    eventTitle = getEventTitle({ eventType, eventTitleOverride }),
    startUnix = computedStartDatetime.unix(),
    endUnix = computedEndDatetime.unix(),
    embed = buildEventEmbed({
      eventTitle,
      startUnix,
      endUnix,
      eventType,
      eventTitleOverride,
      imdbUrl,
      title: imdbDetails.title,
      location,
      activities,
      notes,
      screen,
      seats,
      hideScreen,
      hideSeats,
      imageUrl,
      poster: imdbDetails.poster,
    }),
    actionRow = getEventActionRow(),
    thumbnail = getThumbnail(eventType),
    message = await generateEventMessage({ 
      messageContent,
      interaction, 
      parent,
      eventType, 
      parentIsForum, 
      channelIsPinned, 
      embed, 
      actionRow, 
      thumbnail, 
      threadName, 
      endUnix 
    }) 

  await addEvent({
    messageId: message.id,
    eventTitle,
    threadName,
    eventType,
    startDatetime,
    endDatetime,
    startUnix,
    endUnix,
    location,
    allowGuests,
    requestVenmo,
    eventTitleOverride,
    activities,
    imageUrl,
    imdbUrl,
    accountForTrailers,
    channelId: channel.id,
    parentChannelId: parent.id,
    channelIsPost: parentIsForum,
    screen: screen,
    seats: seats,
    hideScreen,
    hideSeats,
    createdById: user.id
  })
}