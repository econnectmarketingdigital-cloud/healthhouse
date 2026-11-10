const CACHE_NAME = 'sheetspark-crm-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ignora requisições de API para não cachear dados dinâmicos do CRM
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

// ==========================================
// PUSH NOTIFICATIONS (Notificações no Celular)
// ==========================================

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Sheets Park CRM', body: event.data.text() };
    }
  }

  const title = data.title || '🔥 Novo Lead Atribuído!';
  const options = {
    body: data.body || 'Você recebeu uma atualização no CRM. Toque para ver.',
    icon: data.icon || '/logo_icon.png',
    badge: data.badge || '/logo_icon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'sheets-crm-lead',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Abrir no CRM' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta do CRM, foca nela e redireciona
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
