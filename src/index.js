// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker to enable PWA installability and offline support.
// Provide an onUpdate callback so the user can reload when a new version is available.
serviceWorkerRegistration.register({
  onUpdate: registration => {
    if (window.confirm('A new version is available. Reload to update?')) {
      // Tell the waiting SW to skip waiting, then reload the page
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
});

// Start measuring performance in your app (optional)
reportWebVitals();
