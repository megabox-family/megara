import config from "../../config.js"
import { ChannelType } from "discord.js"
import { isChannelThread } from "../utils/channels.js"
import { queueApiCall } from "../api-queue.js"
import { checkIfUrlContainsImage, extractFirstNumber, getImdbMovieId, validateDatetime } from "../utils/validation.js"
import { getEventRecord } from "../repositories/events.js"

export default class ScheduleEventGaurdClauses {
  constructor(interaction) {
    const { guild, options, channel, user, command } = interaction,
    accountForTrailers = options.getBoolean(`account-for-trailers`),
    eventType = options.getString(`event-type`)
    
    let screen = options.getString(`screen`),
      seats = options.getString(`seats`),
      hideScreen = options.getBoolean(`hide-screen`),
      hideSeats = options.getBoolean(`hide-seats`)

    screen = screen ? screen : `tbd`
    seats = seats ? seats : `tbd`

    if (eventType !== `cinema`) {
      if (!screen) hideScreen = true
      if (!seats) hideSeats = true
    } else {
      hideScreen = false
      hideSeats = false
    }
    
    this.parentIsForum = channel.parent?.type === ChannelType.GuildForum
    this.interaction = interaction
    this.guild = guild
    this.options = options
    this.channel = channel
    this.user = user
    this.parent = guild.channels.cache.get(channel.parentId)
    this.commandTag = `</${command.name}:${command.id}>`

    this.eventId = options.getString(`event-id`)
    this.eventType = eventType,
    this.startDatetime = options.getString(`start-datetime`)
    this.location = options.getString(`location`)
    this.allowGuests = options.getBoolean(`allow-guests`)
    this.requestVenmo = options.getBoolean(`request-venmo`)
    this.endDatetime = options.getString(`end-datetime`)
    this.threadName = options.getString(`thread-name`)
    this.eventTitleOverride = options.getString(`event-title-override`)
    this.activities = options.getString(`activities`)
    this.imageUrl = options.getString(`image-url`)
    this.imdbUrl = options.getString(`imdb-url`)
    this.accountForTrailers = accountForTrailers ? accountForTrailers : true
    this.screen = screen
    this.seats = seats
    this.hideScreen = hideScreen
    this.hideSeats = hideSeats
    this.notes = options.getString(`notes`)
  }

  async sendReply({ content, ephemeral = true }) {
    await queueApiCall({ 
      apiCall: `reply`,
      djsObject: this.interaction,
      parameters: {
        content,
        ephemeral,
      },
    })
  }

  async checkIfEventMessageExists() {
    const eventMessage = await queueApiCall({
      apiCall: `fetch`,
      djsObject: this.channel.messages,
      parameters: this.eventId
    })

    if (!eventMessage) {
      await this.sendReply({
        content: `The event message you're trying to edit doesn't exist, please verify that you're using the proper message id 🤔`
      })

      return false
    }

    this.eventMessage = eventMessage

    return true
  }

  async checkIfEventExists() {
    const eventRecord = await getEventRecord(this.eventId)

    if (!eventRecord) {
      await this.sendReply({
        content: `The event you're trying to edit doesn't exist 🤔`
      })

      return false
    }

    this.eventRecord = eventRecord

    return true
  }

  async checkIfUserIsEventOwner() {
    if (this.eventRecord.createdBy !== this.user.id) {
      await this.sendReply({
        content: `You can only edit events you've created 🤔`
      })

      return false
    }

    return true
  }
  
  async checkIfChannelIsCompatible() {
    const channelIsThread = isChannelThread(this.channel)

    if (channelIsThread && !this.parentIsForum) {
      await this.sendReply({
        content: `${this.commandTag} cannot be used in a thread 🤔`
      })

      return false
    }

    return true
  }

  async checkIfImageUrlIsValid() {
    const urlContainsImage = await checkIfUrlContainsImage(this.imageUrl)

    if (!urlContainsImage && this.imageUrl) {
      await this.sendReply({
        content: `You provided an invalid or private image url 🤔`
      })

      return false
    }
      
    return true
  }

  async checkIfImbdUrlIsValidAndStoreDetails() {
    const { omdbKey } = config

    if (!omdbKey) {
      await this.sendReply({
        content: `The bot owner hasn't set up the OMBD API key, which is required for IMDb support 🤔`
      })

      return false
    }

    const imdbId = getImdbMovieId(this.imdbUrl)

    if (!imdbId) {
      await this.sendReply({
        content: `You provided an invalid IMDb url 🤔`
      })

      return false
    }

    const logOmdb = false,
      { Title: title, Poster: poster, Runtime: runtime } = (
        await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`)
        .then(async response => {
          const _response = await response?.json()

          if (logOmdb) console.log('res', _response)

          return _response
        })
        .catch(error => console.log(`omdb error`, error))
      ) || {}

    if (!title) {
      await this.sendReply({
        content: `You either provided an invalid IMDb URL or the move has no title attribute 🤔`
      })

      return false
    }

    if (!runtime && !endDateTime) {
      await this.sendReply({
        content: `You provided a valid IMDd URL but the movie has no runtime attribute and you didn't provide an end time 🤔`
      })

      return false
    }

    this.imdbDetails = { title, poster, runtime }

    this.threadName = this.threadName ? this.threadName : title

    return true
  }

  async verifyThatThreadNameIsSetIfEventTypeIsNotCinema() {
    if (this.eventType !== `cinema` && !this.threadName) {
      await this.sendReply({
        content: `You can't schedule a non-cinema event without providing a thread name 🤔`
      })

      return false
    }

    return true
  }

  async checkIfStartDateTimeIsValidAndComputeStartDatetime() {
    const startDatetimeValidationResponse = validateDatetime(this.startDatetime)

    if (!startDatetimeValidationResponse.isValid) {
      await this.sendReply({
        content: "You provided an invalid **start datetime**, format must be \`mm/dd/yy hh:mm (24hr or am/pm)\` (ie \`9/29/23 7:30pm\`, \`9/29/23 19:30\`) 🤔"
      })

      return false
    }

    this.computedStartDatetime = startDatetimeValidationResponse.datetime

    return true
  }

  async checkIfEndDateTimeIsValidAndComputeEndDatetime() {
    if (this.endDatetime) {
      const endDatetimeValidationResponse = validateDatetime(this.endDatetime)

      if (!endDatetimeValidationResponse.isValid) {
        await this.sendReply({
          content: "You provided an invalid **end datetime**, format must be \`mm/dd/yy hh:mm (24hr or am/pm)\` (ie \`9/29/23 7:30pm\`, \`9/29/23 19:30\`) 🤔"
        })

        return false
      }

      if (this.computedStartDatetime > endDatetimeValidationResponse.computedDatetime) {
        await this.sendReply({
          content: `**End datetime** must be after the **start datetime** 🤔`
        })

        return false
      }

      this.computedEndDatetime = endDatetimeValidationResponse.datetime
    } else {
      if (this.eventType !== `cinema`) {
        await this.sendReply({
          content: `You must provide an **end datetime** for non-cinema events 🤔`
        })

        return false
      }

      if (this?.imdbDetails?.runtime) {
        const runtime = extractFirstNumber(this.imdbDetails.runtime),
          endDatetime = this.computedStartDatetime.clone()

        if (this.accountForTrailers) endDatetime.add(runtime * 1 + 20, `minutes`)
        else endDatetime.add(runtime * 1, `minutes`) 

        const roundedToNearest5Minutes = Math.ceil(endDatetime.minutes() / 5) * 5

        endDatetime.minutes(roundedToNearest5Minutes).seconds(0).milliseconds(0)

        this.computedEndDatetime = endDatetime
      } 
    }

    return true
  }
}