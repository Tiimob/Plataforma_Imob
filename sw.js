const CACHE_NAME = 'plataforma-imob-v4.0.1';
const ARQUIVOS_LOCAIS = [
  './',
  './index.html',
  './base-conhecimento.js',
  './chatbot.js',
  './manifest.webmanifest',
  './favicon-even-32.png',
  './favicon-even-64.png',
  './favicon-even.ico',
  './icone-imob-192.png',
  './icone-imob-512.png',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        ARQUIVOS_LOCAIS.map((arquivo) => cache.add(arquivo).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(async () => {
        const armazenada = await caches.match(event.request);
        if (armazenada) return armazenada;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
  );
});
