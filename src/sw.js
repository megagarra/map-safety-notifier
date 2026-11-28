import { precacheAndRoute } from 'workbox-precaching';

const CACHE_NAME = 'map-safety-notifier-v1';
const TILE_CACHE_NAME = 'map-tiles-v2';
const STATIC_CACHE_NAME = 'static-v2';

// Workbox manifest injection point
// directoryIndex: null -> Workbox does not map "/" to the precached index.html; navigations go to
// our network-first handler below (so a new deploy is picked up). Hashed assets still come from the precache.
precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: null, cleanURLs: false });

// Recursos estáticos a serem cacheados
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Padrão para reconhecer URLs de tiles do mapa (CARTO, OSM, etc.)
const TILE_URL_PATTERN = /^https?:\/\/([a-z]\.)?(tile\.openstreetmap\.org|basemaps\.cartocdn\.com|server\.arcgisonline\.com)\/.+\/\d+\/\d+\/\d+/;

// Lista de URLs de tiles que devem ser pré-carregados para melhorar a experiência inicial
// Estes valores devem corresponder ao centro inicial do mapa e zoom
// Formato: {s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
// Tiles are cached as the user browses (CARTO preloading removed: it now requires an API key).
const PRELOAD_TILES = [];

// Função para limitar o tamanho do cache de tiles
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remover os itens mais antigos
    for (let i = 0; i < (keys.length - maxItems); i++) {
      await cache.delete(keys[i]);
    }
  }
};

// Função para pré-carregar tiles importantes
const preloadMapTiles = async () => {
  const cache = await caches.open(TILE_CACHE_NAME);
  const promises = PRELOAD_TILES.map(async (url) => {
    // Verificar se já temos este tile em cache
    const match = await cache.match(url);
    if (!match) {
      try {
        const response = await fetch(url, { mode: 'no-cors' });
        if (response) {
          return cache.put(url, response);
        }
      } catch (error) {
        console.error(`Erro ao pré-carregar tile: ${url}`, error);
      }
    }
  });

  return Promise.all(promises);
};

// Instalação do service worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');

  event.waitUntil(
    Promise.all([
      // Cachear recursos estáticos
      caches.open(STATIC_CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      // Pré-carregar tiles do mapa
      preloadMapTiles().then(() => {
        console.log('[Service Worker] Preloaded map tiles');
      })
    ])
      .then(() => self.skipWaiting()) // Ativar imediatamente
  );
});

// Ativação do service worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');

  event.waitUntil(
    // Limpar caches antigos
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          // Keep current caches and Workbox's own precache; drop old versions (e.g. a stale index.html).
          if (![CACHE_NAME, TILE_CACHE_NAME, STATIC_CACHE_NAME, 'api-v1'].includes(key) && !key.startsWith('workbox-')) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => self.clients.claim()) // Tomar controle de todos os clientes
  );
});

// Função para verificar se uma URL é um tile do mapa
const isTileUrl = (url) => {
  return TILE_URL_PATTERN.test(url);
};

// Função avançada para gerenciar o cache de tiles
const handleTileRequest = async (request) => {
  const cache = await caches.open(TILE_CACHE_NAME);

  // Verificar se temos este tile em cache
  const cachedResponse = await cache.match(request);

  // Se temos resposta em cache, retorná-la imediatamente
  if (cachedResponse) {
    // Ainda assim, atualiza o cache em segundo plano para próxima visita
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse);
        }
      })
      .catch(() => {
        // Falha silenciosa para atualizações em segundo plano
      });

    return cachedResponse;
  }

  // Se não temos em cache, busca da rede
  try {
    const networkResponse = await fetch(request);

    // Se a resposta for válida, armazena no cache
    if (networkResponse.ok) {
      // Clone a resposta antes de armazenar no cache
      await cache.put(request, networkResponse.clone());

      // Limitar o tamanho do cache periodicamente
      limitCacheSize(TILE_CACHE_NAME, 500);
    }

    return networkResponse;
  } catch (error) {
    // Sem conexão, sem cache... não há muito o que fazer
    console.log('[Service Worker] Network request failed for tile');

    // Retornar uma imagem transparente como fallback para evitar erros visuais
    // Isso criará um espaço vazio ao invés de um erro (melhor UX)
    return new Response(
      new Blob([new Uint8Array(0)], { type: 'image/png' }),
      { status: 200 }
    );
  }
};

// Listener para eventos de Push
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Novo Alerta', body: event.data.text() };
    }
  }

  const title = data.title || 'Novo Alerta de Segurança';
  const eventType = data.event || data.type;
  let body = data.body || 'Um novo evento foi reportado no mapa.';
  if (eventType === 'moderation_pending') {
    body = data.body || 'Nova ocorrência aguardando aprovação na fila de moderação.';
  } else if (eventType === 'pin_approved') {
    body = data.body || 'Uma ocorrência foi aprovada e publicada no mapa.';
  } else if (eventType === 'default_location_entry') {
    const neighborhood = data.neighborhood ? ` (${data.neighborhood})` : '';
    body = data.body || `Nova entrada registrada em marcador por bairro${neighborhood}.`;
  }

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.ico',
    data: data, // Armazena os dados para uso no clique
    tag: `${data.event || 'alert'}:${data.pin_id}` || 'general-alert',
    renotify: true,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ver no Mapa' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener para clique na notificação
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');
  const notification = event.notification;
  const data = notification.data;

  notification.close();

  // URL para abrir (pode incluir lat/lng se disponível)
  // Open the alert itself; a rejected report opens "Meus relatos" (shows the reason).
  let urlToOpen = '/';
  if (data && data.event === 'my_report_rejected') {
    urlToOpen = '/#/?myreports=1';
  } else if (data && data.pin_id) {
    urlToOpen = `/#/?pin=${data.pin_id}` + (data.lat && data.lng ? `&lat=${data.lat}&lng=${data.lng}&z=17` : '');
  } else if (data && data.lat && data.lng) {
    urlToOpen = `/#/?lat=${data.lat}&lng=${data.lng}&z=15`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Se já tiver uma aba aberta, foca nela e navega
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
            return client.focus();
          }
        }
        // Se não tiver, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Interceptar requisições
// --- API data cache: the map keeps working offline with the last pins it saw ---
const API_CACHE_NAME = 'api-v1';
const API_CACHE_MAX = 60;
const API_CACHEABLE = /\/api\/(pins(\/nearby|\/stats)?|crime-types|pins\/default-locations)(\?|$)/;

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const hasCopy = !!(await cache.match(request));
  try {
    // Slow network + a saved copy: give up after 6 s and show the copy. No copy: wait as long as it takes.
    const controller = new AbortController();
    const timer = hasCopy ? setTimeout(() => controller.abort(), 6000) : null;
    const response = await fetch(request, { signal: controller.signal });
    if (timer) clearTimeout(timer);
    if (response.ok) {
      // Re-wrap the copy with the time it was saved, so offline users see how old the data is.
      response.clone().blob().then((body) => {
        const headers = new Headers(response.headers);
        headers.set('X-Cached-At', String(Date.now()));
        return cache.put(request, new Response(body, { status: 200, headers }));
      }).then(() => trimCache(API_CACHE_NAME, API_CACHE_MAX)).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-From-Cache', '1');
      headers.set('Access-Control-Expose-Headers', 'X-From-Cache, X-Cached-At');
      return new Response(await cached.blob(), { status: 200, headers });
    }
    throw err;
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Map tiles: cache first, refresh in background
  if (isTileUrl(request.url)) {
    event.respondWith(handleTileRequest(request));
    return;
  }

  // Public API reads (never staff data): network first with timeout, fall back to last copy
  if (url.origin !== self.location.origin && API_CACHEABLE.test(url.pathname + url.search) && !request.headers.has('Authorization')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Page navigations: always try the network so a new deploy is picked up; offline -> cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE_NAME).then(c => c.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match(request)) || Response.error()),
    );
    return;
  }

  // Other same-origin GETs (icons, manifest): stale-while-revalidate, only successful responses
  event.respondWith(
    caches.open(STATIC_CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            cache.put(request, copy);
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
