import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useAuthStore } from './stores/authStore';
import { initNativeApp } from './lib/nativeApp';
import './styles/index.css';

// Initialize auth (check existing session)
useAuthStore.getState().initialize();

// Native-only bootstrap (status bar, splash hide, hardware back,
// push registration). Pure no-op in the web bundle.
initNativeApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
