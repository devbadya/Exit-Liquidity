import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

document.documentElement.classList.add('dark');
document.documentElement.setAttribute('data-theme', 'dark');
// Boot-Skeleton entfernen, sobald das React-Bundle ausgeführt wird
document.getElementById('ts-boot')?.remove();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
