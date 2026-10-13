import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Optional ?seed=123 makes the first battle reproducible (handy for bug reports and demos).
const seedParam = new URLSearchParams(window.location.search).get('seed');
const seed = seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) >>> 0 : undefined;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App seed={seed} />
  </StrictMode>,
);
