/* Optional parent-page helper. A plain fixed-height iframe also works. */
(() => {
  const frame = document.querySelector('iframe[data-unitybc-reader]');
  if (!frame) return;
  const origin = new URL(frame.src,location.href).origin;
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow || event.data?.type !== 'unitybc-reader-height') return;
    const height = Number(event.data.height);
    if (!Number.isFinite(height)) return;
    frame.style.height = Math.max(560,Math.min(900,height))+'px';
  });
  frame.addEventListener('load', () => frame.contentWindow.postMessage({type:'unitybc-reader-measure'},origin));
})();
