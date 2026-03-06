const CACHE_NAME = 'map-safety-notifier-v1';
const TILE_CACHE_NAME = 'map-tiles-v1';
const STATIC_CACHE_NAME = 'static-v1';

// Recursos estáticos a serem cacheados
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Padrão para reconhecer URLs de tiles do mapa (CARTO, OSM, etc.)
const TILE_URL_PATTERN = /^https?:\/\/([a-z]\.)?(tile\.openstreetmap\.org|basemaps\.cartocdn\.com)\/.+\/\d+\/\d+\/\d+/;

// Lista de URLs de tiles que devem ser pré-carregados para melhorar a experiência inicial
// Estes valores devem corresponder ao centro inicial do mapa e zoom
// Formato: {s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
const PRELOAD_TILES = [
  // Tiles centrais ao redor de São Paulo para zoom 12 (ajuste conforme necessário)
  'https://a.basemaps.cartocdn.com/dark_all/12/1491/2270.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1492/2270.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1493/2270.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1491/2271.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1492/2271.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1493/2271.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1491/2272.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1492/2272.png',
  'https://a.basemaps.cartocdn.com/dark_all/12/1493/2272.png',
  
  // Adicione variações para b. e c. subdomains
  'https://b.basemaps.cartocdn.com/dark_all/12/1491/2270.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1492/2270.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1493/2270.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1491/2271.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1492/2271.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1493/2271.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1491/2272.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1492/2272.png',
  'https://b.basemaps.cartocdn.com/dark_all/12/1493/2272.png',
  
  'https://c.basemaps.cartocdn.com/dark_all/12/1491/2270.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1492/2270.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1493/2270.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1491/2271.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1492/2271.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1493/2271.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1491/2272.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1492/2272.png',
  'https://c.basemaps.cartocdn.com/dark_all/12/1493/2272.png',
];

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
          if (![CACHE_NAME, TILE_CACHE_NAME, STATIC_CACHE_NAME].includes(key)) {
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

// Interceptar requisições
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Estratégia para tiles do mapa: Cache primeiro com atualização em background
  if (isTileUrl(event.request.url)) {
    event.respondWith(handleTileRequest(event.request));
  } 
  // Estratégia para recursos estáticos: Cache First
  else if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          return cachedResponse || fetch(event.request)
            .then(response => {
              return caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  // Cachear apenas recursos locais
                  cache.put(event.request.url, response.clone());
                  return response;
                });
            });
        })
    );
  }
}); 