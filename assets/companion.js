(() => {
  const data = JSON.parse(document.querySelector('#material-data').textContent);
  const query = new URLSearchParams(location.search);
  const embedded = query.get('embed') === '1';
  const audio = document.querySelector('audio');
  audio.addEventListener('playing', () => { document.querySelector('[data-error]').hidden = true; });
  for (const link of document.querySelectorAll('[data-language-code], [data-material]')) {
    link.addEventListener('click', () => {
      audio.pause();
      const url = new URL(link.href);
      if (embedded) url.searchParams.set('embed','1');
      if (link.hasAttribute('data-language-code')) {
        const index = Number(document.querySelector('[data-unit-select]').value);
        url.searchParams.set('section',data.units[index].id);
      }
      link.href = url.href;
    });
  }
  // A sibling page replaces this document; every transition stops the old player.
  window.addEventListener('pagehide', () => audio.pause());
  const updateSection = () => {
    const unit = data.units[Number(document.querySelector('[data-unit-select]').value)];
    if (!unit) return;
    const url = new URL(location.href);
    if (data.units.length > 1) url.searchParams.set('section',unit.id);
    else url.searchParams.delete('section');
    history.replaceState(null,'',url);
    const full = document.querySelector('.embed-open');
    const fullUrl = new URL(location.href); fullUrl.searchParams.delete('embed'); full.href = fullUrl.href;
  };
  new MutationObserver(updateSection).observe(document.querySelector('[data-unit-title]'),{childList:true,subtree:true});
  updateSection();
  if (!embedded || window.parent === window) return;
  // Public prototype may be embedded in the official site or its own embed test.
  const allowedParents = new Set(['https://www.ceu.ox.ac.uk','https://embed-check.unitybc-read-and-listen.pages.dev',location.origin]);
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch { return; }
  if (!allowedParents.has(parentOrigin)) return;
  function reportHeight() {
    window.parent.postMessage({type:'unitybc-reader-height',height:Math.max(560,Math.min(900,window.innerHeight))},parentOrigin);
  }
  window.addEventListener('message',event => {
    if(event.source !== window.parent || event.origin !== parentOrigin || event.data?.type !== 'unitybc-reader-measure') return;
    reportHeight();
  });
  reportHeight();
})();
