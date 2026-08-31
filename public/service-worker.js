// Service Worker de base pour PWA DaloaMarket (network-first pour HTML)
// Important: ne JAMAIS mettre en cache les requêtes API cross-origin (ex: Supabase)
// sinon on peut “figer” une réponse vide et faire disparaître les données au refresh.
const CACHE_NAME = 'daloamarket-cache-v10'; // bump pour invalider anciens caches
const urlsToCache = [
  '/',
  '/logo.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  // Ajoutez ici d'autres ressources statiques si besoin
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // Active immédiatement la nouvelle version du SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Prend le contrôle des clients ouverts (onglets)
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne jamais intercepter les requêtes cross-origin (ex: https://*.supabase.co/rest/v1/...)
  // Le cache SW est prévu uniquement pour l'app shell (HTML + assets locaux).
  try {
    const u = new URL(request.url);
    if (u.origin !== self.location.origin) {
      return;
    }
  } catch {
    // Si l'URL n'est pas parsable, on laisse passer.
    return;
  }

  // En développement (localhost), ne rien intercepter pour éviter les erreurs avec Vite
  try {
    const u = new URL(request.url);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const isDevAsset = u.pathname.startsWith('/@vite') || u.pathname.startsWith('/@react-refresh') || u.pathname.startsWith('/src/');
    if (isLocal || isDevAsset) {
      return; // laisser Vite gérer toutes les requêtes en dev
    }
  } catch {
    return;
  }

  // Ne jamais intercepter les requêtes JS/CSS du build Vite (assets/)
  if (request.url.includes('/assets/')) {
    return;
  }

  // Laisser passer sans interception toute requête non-GET (POST, PUT, etc.)
  if (request.method !== 'GET') {
    return; // on ne cache pas et on évite Cache.put sur POST
  }

  const acceptHeader = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    // Pour l'HTML: stratégie network-first pour éviter un index.html périmé
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Met en cache la nouvelle version de la page
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Fallback offline sur la version en cache
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Pour le reste: cache-first basique (icônes, manifest, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          // Sécurité: uniquement cache des réponses GET OK
          if (request.method === 'GET' && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return new Response('Offline resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        });
    })
  );
});

// ========================================
// Web Push Notification Handlers
// ========================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'DaloaMarket',
      body: event.data.text(),
      icon: '/web-app-manifest-192x192.png',
      url: '/',
    };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    image: data.image || undefined,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'daloamarket-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'Ouvrir', icon: '/android-chrome-192x192.png' },
      { action: 'dismiss', title: 'Fermer' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'DaloaMarket', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Si l'utilisateur clique sur "Fermer", ne rien ouvrir
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet existant est ouvert, le focus et naviguer
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Sinon, ouvrir un nouvel onglet
      return self.clients.openWindow(urlToOpen);
    })
  );
});
