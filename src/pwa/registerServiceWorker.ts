export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => undefined);
        // Do not force a navigation when a new worker takes control. Forced
        // reloads race with Playwright/browser navigation and can abort the
        // current document. Hashed Vite assets are safe to switch on the next
        // normal navigation/reload.
      })
      .catch((error: unknown) => {
        console.warn('Marcenapp Service Worker registration failed:', error);
      });
  });
}
