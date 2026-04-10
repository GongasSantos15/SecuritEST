import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Tenta sem as chavetas e sem o .tsx
import './GlobalStyle' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)