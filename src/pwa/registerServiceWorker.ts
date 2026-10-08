export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // Register the controllerchange listener BEFORE register(). A new worker
    // can install/activate very quickly; attaching the listener only after
    // register() resolves creates a race where an already-open PWA keeps
    // executing the old JS bundle indefinitely.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Ignore the first controller claim on a page that had no controller.
      // Reload only when an existing controlled client switches workers.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch((error: unknown) => {
        console.warn('Marcenapp Service Worker registration failed:', error);
      });
  });
}
