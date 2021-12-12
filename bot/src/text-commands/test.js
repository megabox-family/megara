import { getCommandLevelForChannel } from '../repositories/channels.js'
import ffmpeg from 'fluent-ffmpeg'
import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import color from './color.js'
import { CommandInteractionOptionResolver } from 'discord.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
    )

    return
  }

  const guild = message.guild,
    colorRoles = guild.roles.cache
      .filter(role => role.name.match(`^~.+~`))
      .map(colorRole => {
        return {
          name: colorRole.name.match(`(?!~).+(?=~)`)[0],
          color: colorRole.hexColor,
        }
      })

  colorRoles.sort((a, b) => (a.name < b.name ? -1 : 1))

  let widthArray = [],
    height = 6,
    drawTextFilterArray = []

  colorRoles.forEach(colorRole => {
    let width = 12

    width += colorRole.name.length * 14
    widthArray.push(width)

    drawTextFilterArray.push(
      `drawtext=fontfile=/app/src/media/RobotoMono-Bold.ttf:text=${colorRole.name}:x=6:y=${height}:fontsize=24:fontcolor=${colorRole.color}`
    )

    height += 30
  })

  widthArray.sort((a, b) => a - b)

  const resolution = `${widthArray.pop()}x${height}`

  // console.log(drawTextFilterArray)

  ffmpeg()
    .input(`color=color=black@0.0:size=${resolution},format=rgba`)
    .inputFormat(`lavfi`)
    .inputOption(`-y`)
    // .outputOptions(`-vf "${drawTextFilterArray.join(`,`)}"`)
    .outputOption(`-vframes 1`)
    .outputOption(`-q:v 2`)
    .save(`/app/src/media/test.png`)
}

// .match(`(?!~).+(?=~)`)
// `drawtext=fontfile=/app/src/media/RobotoMono-Bold.ttf:text=${colorRole.name}:x=6:y=${height}:fontsize=24:fontcolor=${colorRole.color}`
