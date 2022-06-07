import { directMessageError } from './error-logging.js'

function removeDuplicatePin(message, user) {
  const pinReactions = message.reactions.cache.get(`📌`)

  let reactionDeleted = false

  if (pinReactions.count > 1) {
    pinReactions.users.remove(user)

    reactionDeleted = true
  }

  return reactionDeleted
}

export async function pinMessage(reaction, user) {
  if (reaction._emoji.name !== `📌`) return

  const message = await reaction.message.fetch(),
    guild = message.guild

  const reactionDeleted = removeDuplicatePin(message, user)

  if (reactionDeleted) return

  if (message.pinned) {
    reaction.remove()

    const member = guild.members.cache.get(user.id)

    member
      .send(
        `You tried pinning a message that is already pinned, therefore your 📌 reaction has been removed.`
      )
      .catch(error => directMessageError(error, user))

    return
  } else await message.pin()
}

export async function unpinMessage(reaction, user) {
  if (reaction._emoji.name !== `📌`) return

  const message = await reaction.message.fetch(),
    pinReactions = message.reactions.cache.get(`📌`),
    count = pinReactions?.count ? pinReactions.count : 0

  if (count === 0) await message.unpin()
}
