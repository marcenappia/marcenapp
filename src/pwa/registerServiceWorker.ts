export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => undefined);

        // When an installed PWA receives a newer worker, reload the current
        // client once so the mobile app switches to the new application bundle.
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
      })
      .catch((error: unknown) => {
        console.warn('Marcenapp Service Worker registration failed:', error);
      });
  });
}
