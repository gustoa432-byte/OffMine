/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, MIT License */
let coepCredentialless = true;

if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          newHeaders.set(
            'Cross-Origin-Embedder-Policy',
            coepCredentialless ? 'credentialless' : 'require-corp'
          );
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => {
          console.warn('[COI-SW] Fetch error:', e);
          return fetch(event.request);
        })
    );
  });
} else {
  (() => {
    const n = window.navigator;
    if (window.crossOriginIsolated === true) {
      return;
    }
    if (!n.serviceWorker) {
      return;
    }

    n.serviceWorker.register('./coi-serviceworker.js').then(
      (registration) => {
        registration.addEventListener('updatefound', () => {
          if (!sessionStorage.getItem('coi_reloaded')) {
            sessionStorage.setItem('coi_reloaded', 'true');
            window.location.reload();
          }
        });

        if (registration.active && !n.serviceWorker.controller) {
          if (!sessionStorage.getItem('coi_reloaded')) {
            sessionStorage.setItem('coi_reloaded', 'true');
            window.location.reload();
          }
        }
      },
      (err) => {
        console.warn('COI service worker registration skipped/failed: ', err);
      }
    );

    n.serviceWorker.addEventListener('controllerchange', () => {
      if (window.crossOriginIsolated === false && !sessionStorage.getItem('coi_reloaded')) {
        sessionStorage.setItem('coi_reloaded', 'true');
        window.location.reload();
      }
    });
  })();
}
