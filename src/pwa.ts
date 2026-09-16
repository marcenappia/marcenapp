const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

export const registerPwa = () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD || isStandalone()) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // PWA is an enhancement; a registration failure must never block the app.
    });
  }, { once: true });
};
