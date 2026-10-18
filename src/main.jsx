import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './registerServiceWorker'

registerServiceWorker();

console.log('main.jsx is executing');
console.log('Root element:', document.getElementById('root'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
