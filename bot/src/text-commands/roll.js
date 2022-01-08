import { getCommandName } from '../utils/text-commands.js'

const command = getCommandName(import.meta.url)

function isRollValid(roll) {
  const lowerCaseRoll = roll.toLowerCase()
  const factors = lowerCaseRoll.split('d')
  return (
    lowerCaseRoll.includes('d') &&
    factors.length === 2 &&
    factors.every(x => x.match(`^[0-9]+$`))
  )
}

export default async function (message, commandSymbol, roll) {
  if (!roll) {
    message.reply(
      `
        Invalid input, the ${commandSymbol}${command} command requires arguments.\
        \nExample: \`${commandSymbol}${command} 1d20\`
      `
    )

    return
  }

  if (isRollValid(roll)) {
    const [dieCount, die] = roll.toLowerCase().split('d')
    let total = 0
    let rolls = []

    for (let i = 0; i < dieCount; i++) {
      const result = Math.floor(Math.random() * die) + 1
      total += result
      rolls.push(result)
    }
    message.reply(
      `Rolled: \`\`\`md\n# Total: ${total}\nDetails: ${roll.toLowerCase()} (${rolls.join(
        ' '
      )})\`\`\``
    )
  } else
    message.reply(
      `Your roll was invalid. Correct syntax is: \`[count]d[die]\` e.g. \`${commandSymbol}${command} 1d20\``
    )
}
