import React from 'react'
import './home.scss'
import megaboxGray from '../../media/megabox-gray.svg'
import nitroStar from '../../media/nitro-star.svg'

const Home = () => {
  return (
    <div className="coming-soon">
      <div className="header-image">
        <div className="header-content">
          <img className="small-nitro-star" src={nitroStar} />
          <h1 className="header-text">Megabox</h1>
        </div>
      </div>
      <div className="content">
        <span className="coming-soon-message">
          🚧 Channel Manager Coming Soon 🚧
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
