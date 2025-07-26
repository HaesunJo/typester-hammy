// Global polyfill for Electron renderer - must be first!
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: 'development' } };

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('Renderer script loaded');

const container = document.getElementById('root');
console.log('Container found:', container);

if (!container) {
  throw new Error('Root container not found');
}

console.log('Creating React root...');
const root = createRoot(container);
console.log('Rendering App...');
root.render(<App />);
console.log('App rendered');