import React from 'react';
import ReactDOM from 'react-dom/client';

// Globally override toLocaleDateString to enforce DD/MM/YYYY format across the entire website
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales, options) {
    if (isNaN(this.getTime())) {
        return originalToLocaleDateString.call(this, locales, options);
    }
    const day = String(this.getDate()).padStart(2, '0');
    const month = String(this.getMonth() + 1).padStart(2, '0');
    const year = this.getFullYear();
    return `${day}/${month}/${year}`;
};

import App from './App';
import './index.css';
import { ensureStorageSchema } from '@core/utils/storage';

// Wipe legacy persisted blobs from previous schema versions on the very first
// load after a deploy. Runs synchronously before React mounts so no component
// can ever read stale state from a bumped schema version.
ensureStorageSchema();

// Register Service Worker for custom offline screen on network switching / disconnects
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
