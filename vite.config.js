import { defineConfig } from 'vite';

// Old bookmarks remain useful; all screens use the authenticated app router.
export default defineConfig({
  build: { rollupOptions: { input: ['index.html', 'mobile.html', ...['index', 'dashboard', 'dashboard-desktop', 'shopkeeper', 'business-setup'].map(name => `MOBILE version/assets/index.html/${name}.html`)] } },
  plugins: [{
    name: 'legacy-page-redirects',
    generateBundle: { order: 'post', handler(options, bundle) {
      const assets = [...Object.keys(bundle), 'branding/trauts-logo.jpg'];
      const version = assets.join('|');
      let hash = 0; for (const char of version) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'trauts-app-${Math.abs(hash)}';
const FILES = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(f => new URL(f, self.registration.scope).href)))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('trauts-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const base = new URL(self.registration.scope);
  let path;
  try { path = decodeURIComponent(url.pathname.slice(base.pathname.length)); } catch { return; }
  if (!FILES.includes(path) && !(event.request.mode === 'navigate' && path === '')) return;
  event.respondWith(event.request.mode === 'navigate'
    ? fetch(event.request).catch(() => caches.match(new URL(path || 'index.html', base).href, { ignoreVary: true }))
    : caches.match(event.request, { ignoreVary: true }).then(saved => saved || fetch(event.request)));
});` });
      for (const name of ['dashboard', 'shopkeeper', 'business-setup']) {
        this.emitFile({ type: 'asset', fileName: `${name}.html`, source:
          '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><a href="./">Open TRAUTS</a>' });
      }
    } },
  }],
});
