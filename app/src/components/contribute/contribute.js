import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Navigate } from 'react-router-dom'
import './contribute.scss'

const Contribute = () => {
  const [userData, setUserData] = useState(null)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    axios
      .get('/api/auth/login', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Credentials': true,
        },
      })
      .then(res => {
        setUserData(res.data)
      })
      .catch(() => setShouldRedirect(true))
  }, [])

  return shouldRedirect ? (
    <Navigate to="/" replace />
  ) : (
    <div className="message">
      You should only see this if you're logged in, {userData?.discordUsername}!
    </div>
  )
}

export default Contribute
