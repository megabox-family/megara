'use strict'

const dotenv = require('dotenv')
dotenv.config()

const e = process.env

const isDevelopment = e.NODE_ENV === 'development'

module.exports = {
  botToken: e.DISCORD_BOT_TOKEN,
  isDevelopment,
  roles: isDevelopment
    ? { verified: '711043006253367427', 'nitro booster': null }
    : {
        verified: '644442586014023680',
        'nitro booster': '586312212612907009',
      },
  joinableChannels: isDevelopment
    ? {
        tech: '711043007545081949',
        conspiracy: '711043007197216881',
        sports: '711043007197216887',
        'animal-crossing': '711043007545081955',
        wow: '711043007813648495',
        cryptocurrency: '711043007197216882',
        'minecraft-server': '711043007813648494',
        'games-general': '711043007545081953',
        dnd: '711043007197216883',
        'the-mandalorian': '711043007545081951',
        programming: '711043007197216886',
        music: '711043007197216885',
      }
    : {
        'minecraft-server': '518206551807229982',
        'minecraft-commands': '599841087926042634',
        programming: '518206926035615765',
        wow: '580508544638648331',
        music: '646028174731509781',
        dnd: '567459948779536392',
        sports: '609204665757728798',
        cryptocurrency: '518207180881788934',
        'games-general': '518205579383013509',
      },
  colorRoles: isDevelopment
    ? {
        'eatbay.com': '711043006253367435',
        geoff: '711043006270013453',
        'doctor worm': '711043006270013451',
        'very rare': '711043006270013450',
        ben: '711043006295179346',
        'bloody blood': '711043006295179345',
        offline: '711043006253367432',
        sobble: '711043006270013452',
        'single quotes': '711043006270013454',
        powerful: '711043006253367430',
        'nancy wheeler': '711043006253367431',
        'the most annoyingly sticky substance ever created by bees':
          '711043006270013457',
        honey: '711043006270013457',
        poopoo: '711043006253367429',
        peen: '711043006253367433',
        'shiny chewtle': '711043006270013455',
        bees: '711043006270013456',
        ponk: '711043006253367434',
        doorhinge: '711043006270013458',
        "that's a dark orange": '711043006270013459',
        nut: '711043006253367428',
      }
    : {
        'eatbay.com': '586356375781769218',
        geoff: '586356951991058481',
        'doctor worm': '586389612944162827',
        'very rare': '586392342315925504',
        ben: '586392365368082442',
        'bloody blood': '586399859549011988',
        offline: '587475672989958154',
        sobble: '601165492702543872',
        'single quotes': '635678982498549777',
        powerful: '648658543372664832',
        'nancy wheeler': '648711964926935040',
        'the most annoyingly sticky substance ever created by bees':
          '648748026998816769',
        honey: '648748026998816769',
        poopoo: '648765795387703306',
        peen: '648766226243518477',
        'shiny chewtle': '648766960028483584',
        bees: '648767159325163530',
        ponk: '648777503141265439',
        doorhinge: '648777708964151334',
        "that's a dark orange": '648778161148002307',
        nut: '648778842730659841',
      },
}
