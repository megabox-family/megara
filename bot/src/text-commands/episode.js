import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandName, cinemaCheck } from '../utils/text-commands.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  if (!(await cinemaCheck(message, commandSymbol, command))) return

  let argArray = []

  if (!(args === null)) argArray = args.split(` `)

  if (argArray.length !== 2) {
    message.reply(
      `\
        \nThe \`${commandSymbol}${command}\` command requires a season number and epsiode number or title 🤔\
        \nFor example: \`${commandSymbol}${command} [season #] [episode]\`, \`${commandSymbol}${command} 2 7\`, \`${commandSymbol}${command} 1 Pilot\`, \`${commandSymbol}${command} 4 Finale\`
      `
    )

    return
  }

  const channel = message.channel
  let thread

  try {
    thread = await channel.threads.create({
      name: `${channel.name} season ${argArray[0]} episode ${argArray[1]}`,
      autoArchiveDuration: 10080,
      type: 'GUILD_PRIVATE_THREAD',
      reason: 'Needed a separate thread for moderation',
    })
  } catch (error) {
    console.log(
      `There was an error when trying to generate a private thread, see error below:\n${error}`
    )

    message.reply(
      `I was unable to create a thread, either threads are disabled server wide or the server doesn't have enough boosts to create private threads.`
    )

    return
  }

  const episodeButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!join-thread: ${thread.id}`)
      .setLabel(`Join Thread`)
      .setStyle('SUCCESS')
  )

  message.channel
    .send({
      content: `A new thread for **${channel.name} season ${argArray[0]} episode ${argArray[1]}** has been created, press the button below to join the thread (**spoiler warning**):`,
      components: [episodeButton],
    })
    .catch(error => directMessageError(error, guildMember))
}
