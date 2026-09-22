export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch((error: unknown) => {
        console.warn('Marcenapp Service Worker registration failed:', error);
      });
  });
}
