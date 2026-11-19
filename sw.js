/* ORACLE PROTOCOL v6 WP11 — offline service worker. Same-origin only, cache-first, versioned.
 * It only ever requests this site's own files (the list below, or a same-origin file the page asks for);
 * it never contacts any other origin and sends nothing anywhere. No install prompt, no update banner:
 * a new VERSION installs in the background and applies on the next load. `?nosw=1` unregisters it (app-shell.js).
 * VERSION = first 12 hex of SHA-256 over the asset files; `node tools/sw-version.cjs` rewrites it,
 * and tests/sw.test.cjs fails if it is stale or if index.html loads a file missing from ASSETS. */
'use strict';
const VERSION = 'v8-a7c59a07a815';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'theme-boot.js', 'theme.css', 'styles.css', 'chapters.css', 'css/v4.css', 'css/v6.css', 'css/v7.css', 'css/v8.css', 'fonts/fonts.css',
  'core/icons.js',
  'core/router.js', 'core/state.js', 'core/ranker.js', 'core/sheet.js', 'core/device.js', 'core/privacy.js', 'core/vendor.js', 'core/build-gif.js',
  'vendor/gifenc-1.0.3/gifenc.esm.js', 'vendor/zzfx-1.4.0/ZzFX.js',
  'ui/components.js', 'app-core.js', 'data/evidence.js', 'data/content.js',
  'art/oracle-art.js', 'art/layers.js', 'art/fingerprint.js', 'art/engine.js', 'art/build.js', 'core/sound.js', 'app-shell.js',
  'screens/start.js', 'screens/evidence.js', 'screens/trade.js', 'screens/footprint.js', 'screens/device.js',
  'screens/loop-cards.js', 'screens/feed.js', 'screens/reveal.js', 'screens/artwork.js', 'screens/extras.js', 'app-ui.js',
  'fonts/Fraunces-variable.woff2', 'fonts/IBMPlexMono-italic-300.woff2', 'fonts/IBMPlexMono-italic-400.woff2',
  'fonts/IBMPlexMono-normal-300.woff2', 'fonts/IBMPlexMono-normal-400.woff2', 'fonts/IBMPlexMono-normal-500.woff2',
  'fonts/IBMPlexMono-normal-600.woff2', 'fonts/IBMPlexSans-italic-400.woff2', 'fonts/IBMPlexSans-variable.woff2',
  'fonts/SpaceGrotesk-variable.woff2', 'fonts/Syne-variable.woff2',
  'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
const CACHE = 'oracle-' + VERSION;
const scope = () => self.registration.scope;
const sameOrigin = (url) => new URL(url).origin === self.location.origin;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new URL(a, scope()).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('oracle-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !sameOrigin(req.url)) return; // other origins: not ours to touch (CSP blocks them anyway)
  if (req.mode === 'navigate') {
    // every page of the app is index.html (routes live in the hash); query strings like ?theme= are read by the page
    e.respondWith(caches.match(new URL('index.html', scope()).href).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
