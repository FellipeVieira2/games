import { defineConfig } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    {
      name: 'offline-shell',
      apply: 'build',
      async closeBundle() {
        const files = [
          'index.html',
          'icon.svg',
          ...(await readdir('dist/assets')).map((file) => `assets/${file}`),
        ];
        const hash = createHash('sha256');
        for (const file of files.sort()) hash.update(file).update(await readFile(`dist/${file}`));
        const version = hash.digest('hex').slice(0, 12);
        await writeFile(
          'dist/sw.js',
          `const CACHE = 'garage-empire-${version}';
const FILES = ${JSON.stringify(files.map((f) => './' + f))};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('message', e => { if (e.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('garage-empire-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});`,
        );
      },
    },
  ],
});
