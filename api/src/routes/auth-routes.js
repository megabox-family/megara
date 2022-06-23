const express = require('express')
const router = express.Router()
const passport = require('passport')

const config = require('../../config')

router.get('/', passport.authenticate('discord'))

router.get(
  '/redirect',
  passport.authenticate('discord', {
    successRedirect: config.appUrl,
    failureRedirect: '/auth/failure',
  })
)

router.get('/login', (req, res) => {
  if (req.user) {
    res.status(200).json(req.user)
  } else
    res
      .status(401)
      .json({ success: false, message: 'User failed to authenticate' })
})

router.get('/logout', (req, res) => {
  req.logout()
  res.redirect(config.appUrl)
})

router.get('/failure', (req, res) => {
  res.status(401).redirect(config.appUrl)
})

module.exports = router
