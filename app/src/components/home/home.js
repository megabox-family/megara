import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Nav from '../nav/nav'
import './home.scss'
import megaboxGray from '../../media/megabox-gray.svg'
import nitroStar from '../../media/nitro-star.svg'

const Home = () => {
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    axios
      .get('/api/auth/user', {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Credentials': true,
        },
      })
      .then(res => {
        console.log('Got here!', res.data)
        if (res.data?.id) setUserData(res.data)
      })
  }, [])

  return (
    <div className="coming-soon">
      <div className="header-image">
        <Nav userData={userData} />
        <div className="header-content">
          <img className="small-nitro-star" src={nitroStar} />
          <h1 className="header-text">Megabox</h1>
        </div>
      </div>
      <div className="content">
        <span className="coming-soon-message">
          💰 Donations Coming Soon! 💰
        </span>
        <span className="coming-soon-subtitle">Just you wait...</span>
      </div>
      <div className="footer">
        <div className="footer-content">
          <img className="footer-image" src={megaboxGray} />
          <span className="footer-text">Megabox</span>
        </div>
      </div>
    </div>
  )
}

export default Home
