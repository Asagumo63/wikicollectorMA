import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './config/amplify';
import './index.css'
import App from './App.tsx'

// Amplifyの初期化を最優先で行う
Amplify.configure(amplifyConfig);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
