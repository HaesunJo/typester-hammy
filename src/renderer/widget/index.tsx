import React from 'react';
import { createRoot } from 'react-dom/client';
import HammyWidget from './HammyWidget';
import './styles/widget.css';

// React 18의 새로운 root API 사용
const container = document.getElementById('widget-root');
if (container) {
    const root = createRoot(container);
    root.render(<HammyWidget />);
} else {
    console.error('Widget root element not found');
}