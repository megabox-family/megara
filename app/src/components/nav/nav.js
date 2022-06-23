import React from 'react'
import './nav.scss'

const Nav = ({ userData }) => {
  return (
    <div className="nav">
      {userData && userData.id ? (
        <span>
          Logged in as {userData.discordUsername}
          <a className="login-logout" href="/api/auth/logout">
            Logout
          </a>
        </span>
      ) : (
        <a className="login-logout" href="/api/auth">
          Login
        </a>
      )}
    </div>
  )
}

export default Nav
