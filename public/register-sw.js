// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(
      function(registration) {
        console.log('[PWA] Service Worker registration successful:', registration.scope);
      },
      function(err) {
        console.log('[PWA] Service Worker registration failed:', err);
      }
    );
  });
}
