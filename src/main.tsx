import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter as Rounter, Routes, Route, Navigate } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Rounter>
      <Routes>
        <Route path="/" element = {<App />}></Route>
        <Route path="/" element = {<Navigate to="/" />}></Route>
      </Routes>
    </Rounter>
  </StrictMode>,
)
