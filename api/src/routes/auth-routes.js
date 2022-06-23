const express = require('express')
const router = express.Router()
const passport = require('passport')

router.get('/', passport.authenticate('discord'))

router.get(
  '/redirect',
  passport.authenticate('discord', {
    successRedirect: 'http://localhost:3000',
    failureRedirect: '/failure',
  })
)

router.get('/user', (req, res) => {
  if (req.user) {
    res.status(200).json(req.user)
  } else res.status(401).json({ message: 'User failed to authenticate' })
})

module.exports = router
