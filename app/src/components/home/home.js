import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from 'react-modal'
import { Navigate } from 'react-router-dom'
import Nav from '../nav/nav'
import './home.scss'
import megaboxGray from '../../media/megabox-gray.svg'
import nitroStar from '../../media/nitro-star.svg'
import tomat from '../../media/tomat.gif'

const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#232529',
  },
}

const Home = () => {
  const [userData, setUserData] = useState(null)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [shouldRedirectToDonations, setShouldRedirectToDonations] =
    useState(false)

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
        console.log('Got here!', res.data)
        if (res.data?.id) setUserData(res.data)
      })
  }, [])

  const handleDonoButtonClick = () => {
    if (userData) setShouldRedirectToDonations(true)
    else setModalIsOpen(true)
  }

  const closeModal = () => {
    setModalIsOpen(false)
  }

  return shouldRedirectToDonations ? (
    <Navigate to="/contribute" replace />
  ) : (
    <div className="coming-soon">
      <div className="header-image">
        <Nav userData={userData} />
        <div className="header-content">
          <img className="small-nitro-star" src={nitroStar} />
          <h1 className="header-text">Megabox</h1>
        </div>
      </div>
      <div className="content">
        <span className="coming-soon-message">💰 Donations Coming Soon 💰</span>
        <span className="coming-soon-subtitle">Just you wait...</span>
      </div>
      <div className="donation-button" onClick={handleDonoButtonClick}>
        <span>click on tomato if ur generous</span>
        <img className="tomato-boy" src={tomat} />
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={modalStyles}
      >
        <span className="subtitle">You need to be logged in to continue.</span>
        <span className="subtitle">Would you like to login with Discord?</span>
        <a className="login-button" href="/api/auth">
          Login
        </a>
        <button className="cancel-button" onClick={closeModal}>
          Cancel
        </button>
      </Modal>
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
