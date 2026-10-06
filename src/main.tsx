import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

let initialTheme: 'light' | 'dark' = 'light'

try {
  initialTheme = window.localStorage.getItem('health-tracker-theme') === 'dark' ? 'dark' : 'light'
} catch {
  initialTheme = 'light'
}

document.documentElement.classList.toggle('dark', initialTheme === 'dark')
document.documentElement.style.colorScheme = initialTheme
document
  .querySelector('meta[name="theme-color"]')
  ?.setAttribute('content', initialTheme === 'dark' ? '#020617' : '#2563eb')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
