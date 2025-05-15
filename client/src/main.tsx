import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// MSW temporarily disabled due to compatibility issues
// if (import.meta.env.DEV) {
//   import('./api/mocks/browser').then(({ worker }) => {
//     worker.start({
//       onUnhandledRequest: 'bypass',
//     })
//   })
// }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)