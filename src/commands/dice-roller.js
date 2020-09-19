const { isNumeric } = require('validator')
const { formatReply } = require('../utils')

const isRollValid = roll => {
  const lowerCaseRoll = roll.toLowerCase()
  const factors = lowerCaseRoll.split('d')
  return (
    lowerCaseRoll.includes('d') &&
    factors.length === 2 &&
    factors.every(x => isNumeric(x))
  )
}

module.exports = (roll, { message, isDirectMessage }) => {
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
      formatReply(
        `rolled: \`\`\`md\n# Total: ${total}\nDetails: ${roll.toLowerCase()} (${rolls.join(
          ' '
        )})\`\`\``,
        isDirectMessage
      )
    )
  } else
    message.reply(
      formatReply(
        'your roll was invalid. Correct syntax is: `[count]d[die]` e.g. `1d20`',
        isDirectMessage
      )
    )
}
