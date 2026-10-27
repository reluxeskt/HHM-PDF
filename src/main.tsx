import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('Connection is closing') ||
      msg.includes('Force close delete origin') ||
      msg.includes('delete origin') ||
      msg.includes('Database closed')
    ) {
      console.warn('Handled IndexedDB connection closure:', msg);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
