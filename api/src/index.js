const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy

const config = require('../config')
const authRouter = require('./routes/auth-routes')
const {
  getUserById,
  getUserByDiscordId,
  recordUserVisit,
  saveNewUser,
} = require('./repositories/users-repository')

app.use(express.json())
app.use(
  cookieSession({
    name: 'session',
    keys: [config.sessionSecret],
    maxAge: config.cookieOptions.maxAge,
  })
)
app.use(cookieParser())
app.use(passport.initialize())
app.use(passport.session())
app.use('/auth', authRouter)

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  const user = await getUserById(id)
  if (user) await recordUserVisit(id)
  done(null, user)
})

passport.use(
  new DiscordStrategy(
    {
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackUrl: '/auth/redirect',
      scope: ['identify', 'guilds'],
    },
    async (accessToken, refreshToken, profile, done) => {
      const userIsInMegabox = profile.guilds.some(
        x => x.id === '146109488745807873'
      )
      const existingUser = await getUserByDiscordId(profile.id)

      if (userIsInMegabox) {
        if (existingUser) {
          await recordUserVisit(existingUser.id)
          done(null, existingUser)
        } else {
          const newUser = await saveNewUser(profile.id, profile.username)
          // TODO: Might want to add a call to the Discord API here to get Megabox data? Nickname, etc.
          done(null, newUser)
        }
      } else {
        done(null, false, { message: 'User is not in Megabox' })
      }
    }
  )
)

const authCheck = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({
      authenticated: false,
      message: 'User has not been authenticated',
    })
  } else {
    next()
  }
}

app.get('/', authCheck, (req, res) => {
  res.status(200).send('Hello world!')
})

app.listen(config.port, () => console.log(`Listening on port ${config.port}`))

process.on('SIGINT', () => {
  process.exit()
})
