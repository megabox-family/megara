export const description = `Frick around and find out 😏`
export const defaultPermission = false,
  options = [
    {
      name: `emoji`,
      description: `An emoji to send to Megara.`,
      type: `STRING`,
      required: true,
    },
  ]

export default function (interaction) {
  const emojiRegex = `(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])`,
    emoji = interaction.options.getString(`emoji`).match(emojiRegex)

  if (!emoji?.[0]) {
    interaction.reply({ content: `That's not an emoji... 🤔`, ephemeral: true })

    return
  }

  const memberId = interaction.member.id,
    megabotId = `598729034867933195`

  switch (emoji?.[0]) {
    case `🍆`:
      if (memberId === megabotId)
        interaction.reply(`<:pogplant:642468716776390658>`)
      else interaction.reply(`😡`)
      break
    case `🍑`:
      if (memberId === megabotId) interaction.reply(`😏`)
      else interaction.reply(`😑`)
      break
    case `😘`:
      if (memberId === megabotId) interaction.reply(`😊`)
      else interaction.reply(`😳`)
      break
    case `😗`:
      if (memberId === megabotId) interaction.reply(`😊`)
      else interaction.reply(`😳`)
      break
    case `😚`:
      if (memberId === megabotId) interaction.reply(`😊`)
      else interaction.reply(`😳`)
      break
    case `😙`:
      if (memberId === megabotId) interaction.reply(`😊`)
      else interaction.reply(`😳`)
      break
    case `😽`:
      if (memberId === megabotId) interaction.reply(`😻`)
      else interaction.reply(`🙀`)
      break
    case `😍`:
      if (memberId === megabotId) interaction.reply(`🥰`)
      else interaction.reply(`🤨`)
      break
    case `🌹`:
      if (memberId === megabotId) interaction.reply(`😍`)
      else interaction.reply(`😯`)
      break
    case `😔`:
      interaction.reply(`So true... 😔`)
      break
    case `🤥`:
      interaction.reply(`🙄`)
      break
    case `😀`:
      interaction.reply(`😁`)
      break
    case `😁`:
      interaction.reply(`😀`)
      break
    case `😂`:
      interaction.reply(`🤣`)
      break
    case `🤣`:
      interaction.reply(`😂`)
      break
    case `😃`:
      interaction.reply(`😄`)
      break
    case `😄`:
      interaction.reply(`😃`)
      break
    case `😡`:
      interaction.reply(`😭`)
      break
    case `🤬`:
      interaction.reply(`😤`)
      break
    case `🤢`:
      interaction.reply(`😨`)
      break
    case `🙏`:
      interaction.reply(`😇`)
    case `😇`:
      interaction.reply(`🙏`)
      break
    case `🔫`:
      interaction.reply(`😵`)
      break
    case `😵`:
      interaction.reply(`🔫`)
      break
    case `🤐`:
      interaction.reply(`😶`)
      break
    case `🛏️`:
      interaction.reply(`😴`)
      break
    case `🤪`:
      interaction.reply(`😱`)
      break
    case `🤠`:
      interaction.reply(`🐄`)
      break
    case `🔥`:
      interaction.reply(`🥵`)
      break
    case `☀️`:
      interaction.reply(`🌕`)
      break
    case `🌕`:
      interaction.reply(`☀️`)
      break
    case `🌕`:
      interaction.reply(`☀️`)
      break
    case `🥸`:
      interaction.reply(`🤔`)
      break
    case `🤧`:
      interaction.reply(`😷`)
      break
    case `🤡`:
      interaction.reply(`Reality is a social construct 🤡`)
      break
    case `🃏`:
      interaction.reply(`🦇`)
      break
    case `🦇`:
      interaction.reply(`🃏`)
      break
    case `🎥`:
      interaction.reply(`How about another Joke Murray? 🔫🤡`)
      break
    case `😵‍💫`:
      interaction.reply(`🙃`)
      break
    case `🙃`:
      interaction.reply(`😵‍💫`)
      break
    case `👹`:
      interaction.reply(`😶‍🌫️`)
      break
    case `🎉`:
      interaction.reply(`🥳`)
      break
    case `🥳`:
      interaction.reply(`🎉`)
      break
    case `🍌`:
      interaction.reply(`🐒`)
      break
    case `🐒`:
      interaction.reply(`🍌`)
      break
    case `👽`:
      interaction.reply(`🛸`)
      break
    case `🛸`:
      interaction.reply(`👽`)
      break
    case `☠️`:
      interaction.reply(`⌛`)
      break
    case `⌛`:
      interaction.reply(`☠️`)
      break
    case `⏳`:
      interaction.reply(`🌹`)
      break
    case `👋`:
      interaction.reply(`✌️`)
      break
    case `✌️`:
      interaction.reply(`👋`)
      break
    case `💃`:
      interaction.reply(`🎶`)
      break
    case `🎶`:
      interaction.reply(`💃`)
      break
    case `🤝`:
      interaction.reply(`🤝`)
      break
    case `🤜`:
      interaction.reply(`🤛`)
      break
    case `🤛`:
      interaction.reply(`🤜`)
      break
    case `🐧`:
      interaction.reply(`Kowalski, analysis 🔎`)
      break
    case `🤓`:
      interaction.reply(`You're a wizard Harry 🪄`)
      break
    case `🤏`:
      interaction.reply(`🍆`)
      break
    case `😎`:
      interaction.reply(`🆒`)
      break
    case `🆒`:
      interaction.reply(`😎`)
      break
    case `💣`:
      interaction.reply(`🚔`)
      break
    case `🚓`:
      interaction.reply(`<a:peperun:983514136946311218>`)
      break
    case `🚔`:
      interaction.reply(`<a:peperun:983514136946311218>`)
      break
    default:
      const emojis = [
        '😄',
        '😃',
        '😀',
        '😊',
        '☺',
        '😉',
        '😍',
        '😘',
        '😚',
        '😗',
        '😙',
        '😜',
        '😝',
        '😛',
        '😳',
        '😁',
        '😔',
        '😌',
        '😒',
        '😞',
        '😣',
        '😢',
        '😂',
        '😭',
        '😪',
        '😥',
        '😰',
        '😅',
        '😓',
        '😩',
        '😫',
        '😨',
        '😱',
        '😠',
        '😡',
        '😤',
        '😖',
        '😆',
        '😋',
        '😷',
        '😎',
        '😴',
        '😵',
        '😲',
        '😟',
        '😦',
        '😧',
        '😈',
        '👿',
        '😮',
        '😬',
        '😐',
        '😕',
        '😯',
        '😶',
        '😇',
        '😏',
        '😑',
        '👲',
        '👳',
        '👮',
        '👷',
        '💂',
        '👶',
        '👦',
        '👧',
        '👨',
        '👩',
        '👴',
        '👵',
        '👱',
        '👼',
        '👸',
        '😺',
        '😸',
        '😻',
        '😽',
        '😼',
        '🙀',
        '😿',
        '😹',
        '😾',
        '👹',
        '👺',
        '🙈',
        '🙉',
        '🙊',
        '💀',
        '👽',
        '💩',
        '🔥',
        '✨',
        '🌟',
        '💫',
        '💥',
        '💢',
        '💦',
        '💧',
        '💤',
        '💨',
        '👂',
        '👀',
        '👃',
        '👅',
        '👄',
        '👍',
        '👎',
        '👌',
        '👊',
        '✊',
        '✌',
        '👋',
        '✋',
        '👐',
        '👆',
        '👇',
        '👉',
        '👈',
        '🙌',
        '🙏',
        '☝',
        '👏',
        '💪',
        '🚶',
        '🏃',
        '💃',
        '👫',
        '👪',
        '👬',
        '👭',
        '💏',
        '💑',
        '👯',
        '🙆',
        '🙅',
        '💁',
        '🙋',
        '💆',
        '💇',
        '💅',
        '👰',
        '🙎',
        '🙍',
        '🙇',
        '🎩',
        '👑',
        '👒',
        '👟',
        '👞',
        '👡',
        '👠',
        '👢',
        '👕',
        '👔',
        '👚',
        '👗',
        '🎽',
        '👖',
        '👘',
        '👙',
        '💼',
        '👜',
        '👝',
        '👛',
        '👓',
        '🎀',
        '🌂',
        '💄',
        '💛',
        '💙',
        '💜',
        '💚',
        '❤',
        '💔',
        '💗',
        '💓',
        '💕',
        '💖',
        '💞',
        '💘',
        '💌',
        '💋',
        '💍',
        '💎',
        '👤',
        '👥',
        '💬',
        '👣',
        '💭',
        '🐶',
        '🐺',
        '🐱',
        '🐭',
        '🐹',
        '🐰',
        '🐸',
        '🐯',
        '🐨',
        '🐻',
        '🐷',
        '🐽',
        '🐮',
        '🐗',
        '🐵',
        '🐒',
        '🐴',
        '🐑',
        '🐘',
        '🐼',
        '🐧',
        '🐦',
        '🐤',
        '🐥',
        '🐣',
        '🐔',
        '🐍',
        '🐢',
        '🐛',
        '🐝',
        '🐜',
        '🐞',
        '🐌',
        '🐙',
        '🐚',
        '🐠',
        '🐟',
        '🐬',
        '🐳',
        '🐋',
        '🐄',
        '🐏',
        '🐀',
        '🐃',
        '🐅',
        '🐇',
        '🐉',
        '🐎',
        '🐐',
        '🐓',
        '🐕',
        '🐖',
        '🐁',
        '🐂',
        '🐲',
        '🐡',
        '🐊',
        '🐫',
        '🐪',
        '🐆',
        '🐈',
        '🐩',
        '🐾',
        '💐',
        '🌸',
        '🌷',
        '🍀',
        '🌹',
        '🌻',
        '🌺',
        '🍁',
        '🍃',
        '🍂',
        '🌿',
        '🌾',
        '🍄',
        '🌵',
        '🌴',
        '🌲',
        '🌳',
        '🌰',
        '🌱',
        '🌼',
        '🌐',
        '🌞',
        '🌝',
        '🌚',
        '🌑',
        '🌒',
        '🌓',
        '🌔',
        '🌕',
        '🌖',
        '🌗',
        '🌘',
        '🌜',
        '🌛',
        '🌙',
        '🌍',
        '🌎',
        '🌏',
        '🌋',
        '🌌',
        '🌠',
        '⭐',
        '☀',
        '⛅',
        '☁',
        '⚡',
        '☔',
        '❄',
        '⛄',
        '🌀',
        '🌁',
        '🌈',
        '🌊',
        '🎍',
        '💝',
        '🎎',
        '🎒',
        '🎓',
        '🎏',
        '🎆',
        '🎇',
        '🎐',
        '🎑',
        '🎃',
        '👻',
        '🎅',
        '🎄',
        '🎁',
        '🎋',
        '🎉',
        '🎊',
        '🎈',
        '🎌',
        '🔮',
        '🎥',
        '📷',
        '📹',
        '📼',
        '💿',
        '📀',
        '💽',
        '💾',
        '💻',
        '📱',
        '☎',
        '📞',
        '📟',
        '📠',
        '📡',
        '📺',
        '📻',
        '🔊',
        '🔉',
        '🔈',
        '🔇',
        '🔔',
        '🔕',
        '📢',
        '📣',
        '⏳',
        '⌛',
        '⏰',
        '⌚',
        '🔓',
        '🔒',
        '🔏',
        '🔐',
        '🔑',
        '🔎',
        '💡',
        '🔦',
        '🔆',
        '🔅',
        '🔌',
        '🔋',
        '🔍',
        '🛁',
        '🛀',
        '🚿',
        '🚽',
        '🔧',
        '🔩',
        '🔨',
        '🚪',
        '🚬',
        '💣',
        '🔫',
        '🔪',
        '💊',
        '💉',
        '💰',
        '💴',
        '💵',
        '💷',
        '💶',
        '💳',
        '💸',
        '📲',
        '📧',
        '📥',
        '📤',
        '✉',
        '📩',
        '📨',
        '📯',
        '📫',
        '📪',
        '📬',
        '📭',
        '📮',
        '📦',
        '📝',
        '📄',
        '📃',
        '📑',
        '📊',
        '📈',
        '📉',
        '📜',
        '📋',
        '📅',
        '📆',
        '📇',
        '📁',
        '📂',
        '✂',
        '📌',
        '📎',
        '✒',
        '✏',
        '📏',
        '📐',
        '📕',
        '📗',
        '📘',
        '📙',
        '📓',
        '📔',
        '📒',
        '📚',
        '📖',
        '🔖',
        '📛',
        '🔬',
        '🔭',
        '📰',
        '🎨',
        '🎬',
        '🎤',
        '🎧',
        '🎼',
        '🎵',
        '🎶',
        '🎹',
        '🎻',
        '🎺',
        '🎷',
        '🎸',
        '👾',
        '🎮',
        '🃏',
        '🎴',
        '🀄',
        '🎲',
        '🎯',
        '🏈',
        '🏀',
        '⚽',
        '⚾',
        '🎾',
        '🎱',
        '🏉',
        '🎳',
        '⛳',
        '🚵',
        '🚴',
        '🏁',
        '🏇',
        '🏆',
        '🎿',
        '🏂',
        '🏊',
        '🏄',
        '🎣',
        '☕',
        '🍵',
        '🍶',
        '🍼',
        '🍺',
        '🍻',
        '🍸',
        '🍹',
        '🍷',
        '🍴',
        '🍕',
        '🍔',
        '🍟',
        '🍗',
        '🍖',
        '🍝',
        '🍛',
        '🍤',
        '🍱',
        '🍣',
        '🍥',
        '🍙',
        '🍘',
        '🍚',
        '🍜',
        '🍲',
        '🍢',
        '🍡',
        '🍳',
        '🍞',
        '🍩',
        '🍮',
        '🍦',
        '🍨',
        '🍧',
        '🎂',
        '🍰',
        '🍪',
        '🍫',
        '🍬',
        '🍭',
        '🍯',
        '🍎',
        '🍏',
        '🍊',
        '🍋',
        '🍒',
        '🍇',
        '🍉',
        '🍓',
        '🍑',
        '🍈',
        '🍌',
        '🍐',
        '🍍',
        '🍠',
        '🍆',
        '🍅',
        '🌽',
        '🏠',
        '🏡',
        '🏫',
        '🏢',
        '🏣',
        '🏥',
        '🏦',
        '🏪',
        '🏩',
        '🏨',
        '💒',
        '⛪',
        '🏬',
        '🏤',
        '🌇',
        '🌆',
        '🏯',
        '🏰',
        '⛺',
        '🏭',
        '🗼',
        '🗾',
        '🗻',
        '🌄',
        '🌅',
        '🌃',
        '🗽',
        '🌉',
        '🎠',
        '🎡',
        '⛲',
        '🎢',
        '🚢',
        '⛵',
        '🚤',
        '🚣',
        '⚓',
        '🚀',
        '✈',
        '💺',
        '🚁',
        '🚂',
        '🚊',
        '🚉',
        '🚞',
        '🚆',
        '🚄',
        '🚅',
        '🚈',
        '🚇',
        '🚝',
        '🚋',
        '🚃',
        '🚎',
        '🚌',
        '🚍',
        '🚙',
        '🚘',
        '🚗',
        '🚕',
        '🚖',
        '🚛',
        '🚚',
        '🚨',
        '🚓',
        '🚔',
        '🚒',
        '🚑',
        '🚐',
        '🚲',
        '🚡',
        '🚟',
        '🚠',
        '🚜',
        '💈',
        '🚏',
        '🎫',
        '🚦',
        '🚥',
        '⚠',
        '🚧',
        '🔰',
        '⛽',
        '🏮',
        '🎰',
        '♨',
        '🗿',
        '🎪',
        '🎭',
        '📍',
        '🚩',
        '⬆',
        '⬇',
        '⬅',
        '➡',
        '🔠',
        '🔡',
        '🔤',
        '↗',
        '↖',
        '↘',
        '↙',
        '↔',
        '↕',
        '🔄',
        '◀',
        '▶',
        '🔼',
        '🔽',
        '↩',
        '↪',
        'ℹ',
        '⏪',
        '⏩',
        '⏫',
        '⏬',
        '⤵',
        '⤴',
        '🆗',
        '🔀',
        '🔁',
        '🔂',
        '🆕',
        '🆙',
        '🆒',
        '🆓',
        '🆖',
        '📶',
        '🎦',
        '🈁',
        '🈯',
        '🈳',
        '🈵',
        '🈴',
        '🈲',
        '🉐',
        '🈹',
        '🈺',
        '🈶',
        '🈚',
        '🚻',
        '🚹',
        '🚺',
        '🚼',
        '🚾',
        '🚰',
        '🚮',
        '🅿',
        '♿',
        '🚭',
        '🈷',
        '🈸',
        '🈂',
        'Ⓜ',
        '🛂',
        '🛄',
        '🛅',
        '🛃',
        '🉑',
        '㊙',
        '㊗',
        '🆑',
        '🆘',
        '🆔',
        '🚫',
        '🔞',
        '📵',
        '🚯',
        '🚱',
        '🚳',
        '🚷',
        '🚸',
        '⛔',
        '✳',
        '❇',
        '❎',
        '✅',
        '✴',
        '💟',
        '🆚',
        '📳',
        '📴',
        '🅰',
        '🅱',
        '🆎',
        '🅾',
        '💠',
        '➿',
        '♻',
        '♈',
        '♉',
        '♊',
        '♋',
        '♌',
        '♍',
        '♎',
        '♏',
        '♐',
        '♑',
        '♒',
        '♓',
        '⛎',
        '🔯',
        '🏧',
        '💹',
        '💲',
        '💱',
        '©',
        '®',
        '™',
        '〽',
        '〰',
        '🔝',
        '🔚',
        '🔙',
        '🔛',
        '🔜',
        '❌',
        '⭕',
        '❗',
        '❓',
        '❕',
        '❔',
        '🔃',
        '🕛',
        '🕧',
        '🕐',
        '🕜',
        '🕑',
        '🕝',
        '🕒',
        '🕞',
        '🕓',
        '🕟',
        '🕔',
        '🕠',
        '🕕',
        '🕖',
        '🕗',
        '🕘',
        '🕙',
        '🕚',
        '🕡',
        '🕢',
        '🕣',
        '🕤',
        '🕥',
        '🕦',
        '✖',
        '➕',
        '➖',
        '➗',
        '♠',
        '♥',
        '♣',
        '♦',
        '💮',
        '💯',
        '✔',
        '☑',
        '🔘',
        '🔗',
        '➰',
        '🔱',
        '🔲',
        '🔳',
        '◼',
        '◻',
        '◾',
        '◽',
        '▪',
        '▫',
        '🔺',
        '⬜',
        '⬛',
        '⚫',
        '⚪',
        '🔴',
        '🔵',
        '🔻',
        '🔶',
        '🔷',
        '🔸',
        '🔹',
      ]

      interaction.reply(emojis[Math.floor(Math.random() * emojis.length)])
  }
}
