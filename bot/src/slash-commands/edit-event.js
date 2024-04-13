import { ApplicationCommandOptionType } from "discord.js"
import ScheduleEventGaurdClauses from "../guard-clauses/schedule-event.js"
import { buildEventEmbed, getEventTitle, getMessageContent, getThumbnail } from "./schedule-event.js"
import { queueApiCall } from "../api-queue.js"
import { editEvent } from "../repositories/events.js"

export const description = `Edit the details of an existing event, details not selected/edited will remain the same.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `event-id`,
      description: `The message id of the event you'd like to edit.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `event-type`,
      description: `The type of the event you're scheduling.`,
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: `adventure`, value: `adventure` },
        { name: `cinema`, value: `cinema` },
        { name: `miscellaneous`, value: `new` },
      ],
    },
    {
      name: `start-datetime`,
      description: `Event start date & time [mm/dd/yy hh:mm 24hr|12hr]. (ie 9/29/23 19:30, 9/29/23 7:30pm)`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `location`,
      description: `The location at which the event will take place.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `allow-guests`,
      description: `Determines if attendees can choose to bring guests or not.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `request-venmo`,
      description: `Determines if the attendee's venmo tag is requested when they mark as attending.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `end-datetime`,
      description: `Event end date & time [mm/dd/yy hh:mm 24hr|12hr]. (ie 9/29/23 19:30, 9/29/23 7:30pm)`,
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
      description: `A comma delimited list of activities. (ie: camping, hiking, swimming, gambling 😈, etc)`,
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: `image-url`,
      description: `The url to the image you'd like to display at the bottom of the embed. (overrides imdb)`,
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
      description: `Adds 20 minutes to the event duration to account for trailers.`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `screen`,
      description: `The screen number at which the event will take place.`,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: `seats`,
      description: `The range of seats you have reserved for this event.`,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: `hide-screen`,
      description: `Hides the screen field.`,
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: `hide-seats`,
      description: `Hides the seats field.`,
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: `notes`,
      description: `Custom notes regarding this event.`,
      type: ApplicationCommandOptionType.String,
      required: false,
    }
  ]

export default async function (interaction) {
  const scheduleEventGaurdClauses = new ScheduleEventGaurdClauses(interaction)

  if(!(await scheduleEventGaurdClauses.checkIfEventMessageExists())) return
  if(!(await scheduleEventGaurdClauses.checkIfEventExists())) return
  if(!(await scheduleEventGaurdClauses.checkIfUserIsEventOwner())) return

  const { eventRecord } = scheduleEventGaurdClauses

  scheduleEventGaurdClauses.eventType = scheduleEventGaurdClauses.eventType ? scheduleEventGaurdClauses.eventType : eventRecord.eventType
  scheduleEventGaurdClauses.startDatetime = scheduleEventGaurdClauses.startDatetime ? scheduleEventGaurdClauses.startDatetime : eventRecord.startDatetime
  scheduleEventGaurdClauses.location = scheduleEventGaurdClauses.location ? scheduleEventGaurdClauses.location : eventRecord.location
  scheduleEventGaurdClauses.allowGuests = scheduleEventGaurdClauses.allowGuests ? scheduleEventGaurdClauses.allowGuests : eventRecord.allowGuests
  scheduleEventGaurdClauses.requestVenmo = scheduleEventGaurdClauses.requestVenmo ? scheduleEventGaurdClauses.requestVenmo : eventRecord.requestVenmo
  scheduleEventGaurdClauses.endDatetime = scheduleEventGaurdClauses.endDatetime ? scheduleEventGaurdClauses.endDatetime : eventRecord.endDatetime
  scheduleEventGaurdClauses.threadName = scheduleEventGaurdClauses.threadName ? scheduleEventGaurdClauses.threadName : eventRecord.threadName
  scheduleEventGaurdClauses.eventTitleOverride = scheduleEventGaurdClauses.eventTitleOverride ? scheduleEventGaurdClauses.eventTitleOverride : eventRecord.eventTitleOverride
  scheduleEventGaurdClauses.activities = scheduleEventGaurdClauses.activities ? scheduleEventGaurdClauses.activities : eventRecord.activities
  scheduleEventGaurdClauses.imageUrl = scheduleEventGaurdClauses.imageUrl ? scheduleEventGaurdClauses.imageUrl : eventRecord.imageUrl
  scheduleEventGaurdClauses.imdbUrl = scheduleEventGaurdClauses.imdbUrl ? scheduleEventGaurdClauses.imdbUrl : eventRecord.imdbUrl
  scheduleEventGaurdClauses.accountForTrailers = scheduleEventGaurdClauses.accountForTrailers ? scheduleEventGaurdClauses.accountForTrailers : eventRecord.accountForTrailers
  scheduleEventGaurdClauses.screen = scheduleEventGaurdClauses.screen ? scheduleEventGaurdClauses.screen : eventRecord.screen
  scheduleEventGaurdClauses.seats = scheduleEventGaurdClauses.seats ? scheduleEventGaurdClauses.seats : eventRecord.seats
  scheduleEventGaurdClauses.hideScreen = scheduleEventGaurdClauses.hideScreen ? scheduleEventGaurdClauses.hideScreen : eventRecord.hideScreen
  scheduleEventGaurdClauses.hideSeats = scheduleEventGaurdClauses.hideSeats ? scheduleEventGaurdClauses.hideSeats : eventRecord.hideSeats
  scheduleEventGaurdClauses.notes = scheduleEventGaurdClauses.notes ? scheduleEventGaurdClauses.notes : eventRecord.notes
  
  const { 
    user,
    channel,
    eventMessage,
    eventId,
    eventType, 
    startDatetime,
    location,
    allowGuests,
    requestVenmo,
    endDatetime,
    threadName, 
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

  console.log(imdbUrl)

  if (imdbUrl){
    const imdbUrlIsValid = await scheduleEventGaurdClauses.checkIfImbdUrlIsValidAndStoreDetails()

    if (!imdbUrlIsValid) return
  } 

  const { imdbDetails } = scheduleEventGaurdClauses

  if (!(await scheduleEventGaurdClauses.verifyThatThreadNameIsSetIfEventTypeIsNotCinema())) return 
  if (!(await scheduleEventGaurdClauses.checkIfStartDateTimeIsValidAndComputeStartDatetime())) return 
  if (!(await scheduleEventGaurdClauses.checkIfEndDateTimeIsValidAndComputeEndDatetime())) return

  const { computedStartDatetime, computedEndDatetime } = scheduleEventGaurdClauses,
    channelIsPinned = channel.flags.serialize().Pinned

  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: {
      ephemeral: true,
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
    thumbnail = getThumbnail(eventType)

    await queueApiCall({
      apiCall: `edit`,
      djsObject: eventMessage,
      parameters: {
        content: messageContent,
        embeds: [embed],
        files: [thumbnail],
      },
    })

    editEvent({
      messageId: eventId,
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
      screen,
      seats,
      hideScreen,
      hideSeats
    })

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: {
        content: `Event details have been successfully updated! 🎉`,
        ephemeral: true,
      },
    })
}