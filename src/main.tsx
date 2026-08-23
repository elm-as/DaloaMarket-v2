import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import App from './App';
import './styles/design-tokens.css';
import './styles/global.css';
import './styles/flutter.css';
import { Toaster } from 'react-hot-toast';

// Handle Vite dynamic import chunk load errors (automatically reload page after a deployment update)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preload-error', (event) => {
    console.warn('[Vite Preload Error] Chunk load failed after deployment. Reloading page...');
    event.preventDefault();
    if (!sessionStorage.getItem('daloa_chunk_retry')) {
      sessionStorage.setItem('daloa_chunk_retry', 'true');
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SupabaseProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '14px',
                background: '#fff',
                color: '#1F2937',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
                fontSize: '14px',
                padding: '12px 16px',
              },
            }}
          />
        </SupabaseProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register Service Worker for Push Notifications & PWA Cache
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[SW] ✅ Service Worker enregistré, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] ❌ Échec enregistrement Service Worker:', err);
      });
  });
}
