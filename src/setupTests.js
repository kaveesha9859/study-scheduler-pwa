// src/setupTests.js

// 1) Mock the Canvas API so Chart.js doesn’t crash in jsdom
import 'jest-canvas-mock';

// 2) Polyfill IndexedDB for idb-based db.js
import 'fake-indexeddb/auto';

// 3) jest-dom adds custom matchers like .toBeInTheDocument()
import '@testing-library/jest-dom';

// 4) Polyfill structuredClone for fake-indexeddb
if (typeof structuredClone === 'undefined') {
  global.structuredClone = obj => JSON.parse(JSON.stringify(obj));
}

// 5) Polyfill Notification API so window.Notification exists
if (typeof global.Notification === 'undefined') {
  global.Notification = {
    permission: 'granted',
    requestPermission: () => Promise.resolve('granted')
  };
}
