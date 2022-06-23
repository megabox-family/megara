import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './components/home/home'
import Contribute from './components/contribute/contribute'
import './app.scss'

const App = () => {
  return (
    <div className="background">
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/contribute" element={<Contribute />} />
      </Routes>
    </div>
  )
}

export default App
