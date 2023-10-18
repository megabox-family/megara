import moment from 'moment-timezone'

export const commasFollowedBySpace = /,\s+/g

export function removeSpacesAfterCommas(string) {
  return string?.replaceAll(/,\s+/g, `,`)
}

export function isFirstCharacterAtSymbol(string) {
  return string?.match(`^@`) ? true : false
}

export function getCustomIdContext(customId) {
  return customId?.match(`(?<=:\\s).+`)?.[0]
}

export function isColorRole(roleName) {
  return roleName?.match(`^~.+~$`)
}

export function isNotificationRole(roleName) {
  return roleName?.match(`^-.+-$`)
}

export function getNotificationRoleBasename(roleName) {
  return roleName?.match(`(?<=-).+(?=-)`)?.[0]
}

export function getRoleIdFromTag(tag) {
  return tag?.match(`(?<=<@&)[0-9]+(?=>$)`)?.[0]
}

export function getButtonNumber(listItem) {
  return listItem?.match(`[0-9]+(?=\\.)`)?.[0]
}

export function getRoleIdsFromMessage(message) {
  return message?.match(/(?<=<@&)[0-9]{18}(?=>)/g)
}

export function isDynamicThread(threadName) {
  return threadName?.match(`(?!.*-)[0-9]+$`)
}

export function getUserIdFromTag(userTag) {
  return userTag?.match(`((?<=^<@!)|(?<=^<@))[0-9]+(?=>$)`)?.[0]
}

export function getNumberNotDescriminator(userTag) {
  return userTag?.match(`[0-9]{5,}`)?.[0]
}

export function formatQuestion(question) {
  if (!question?.match(`\\?$`)) return `${question.trim()}?`

  return question.trim()
}

export function validateTimeStamp(timeStamp) {
  const correctStructure = timeStamp?.match(
    `^[0-9]$|^[0-9][0-9]$|^[0-9]:[0-9][0-9]$|^[0-9][0-9]:[0-9][0-9]$|^[0-9]:[0-9][0-9]:[0-9][0-9]$|[0-9][0-9]:[0-9][0-9]:[0-9][0-9]`
  )

  if (correctStructure) {
    const noColons = timeStamp.replaceAll(`:`, ``)

    if (parseInt(noColons) === 0) return false
    else return true
  }

  return false
}

export function formatPercent(number) {
  return Number(number).toLocaleString(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
  })
}

export function validateTagArray(tagArray) {
  const invalidTag = tagArray.find(
    tag => !tag?.match(`^<@&[0-9]+>$|^<@[0-9]+>$`)
  )

  return invalidTag ? false : true
}

export function getImdbMovieId(imdbUrl) {
  const movieId = imdbUrl?.match(`tt[0-9]+`)?.[0]

  return movieId
}

export function isPositiveNumber(string) {
  return string.match(`^\\d+$`)
}

export function getVoiceChannelBasename(channelName) {
  let basename = channelName.match(`.+(?=-\\d+$)`)?.[0]

  basename = basename ? basename : channelName

  return basename
}

export async function checkIfUrlContainsImage(url) {
  if (!url) return null

  const imageFetch = await fetch(url, { method: 'HEAD' })
      .then(result => result)
      .catch(error =>
        console.log(
          `User didn't provide valid image url (schedule-event command).`
        )
      ),
    { type } = (await imageFetch?.blob()) || {},
    isImage = type?.startsWith('image/')

  return isImage
}

export function validateDatetime(datetimeString) {
  const returnObject = {},
    dateTimeRegex = `(^((?:[0-9]\\/)|(?:0[0-9]\\/)|(?:1[0-2]\\/))((?:[1-9]\\/)|(?:[0-2][0-9]\\/)|(?:[3][0-1]\\/))(?:[0-9][0-9]\\s)((?:[1-9]:)|(?:[0][1-9]:)|(?:[1][0-2]:))(?:[0-5][0-9][ap])m$)|(^((?:[0-9]\\/)|(?:0[0-9]\\/)|(?:1[0-2]\\/))((?:[1-9]\\/)|(?:[0-2][0-9]\\/)|(?:[3][0-1]\\/))(?:[0-9][0-9]\\s)((?:[0-9]:)|(?:[0-9][0-9]:))(?:[0-5][0-9])$)`

  if (!datetimeString?.match(dateTimeRegex)) {
    returnObject.isValid = false

    return returnObject
  }

  const dateFormat = datetimeString.toLowerCase().match(`[a-z]`)
      ? 'MM/DD/YY hh:mm a'
      : 'MM/DD/YY HH:mm',
    datetime = moment(datetimeString, dateFormat)

  if (datetime.isValid()) {
    returnObject.isValid = true
    returnObject.datetime = datetime
  } else {
    returnObject.isValid = false
  }

  return returnObject
}

export function extractFirstNumber(string) {
  return string?.match(`\\d+`)?.[0]
}

export function getInteractionCommandName(interactionCommandCustomId) {
  return interactionCommandCustomId?.match(`(?!!).+(?=:\\s|:$)`)?.[0]
}
