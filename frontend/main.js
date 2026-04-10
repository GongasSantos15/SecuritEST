import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App' // Confirma se o teu App.tsx exporta como 'App'
import './GlobalStyle' // Se tiveres estilos globais

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)