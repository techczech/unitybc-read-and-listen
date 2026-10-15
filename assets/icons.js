/* Lucide-style controls. Third-party icon notices are in LICENSE-ICONS. */
(() => {
 const svg = paths => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
 window.UnityBCIcons = {
  Focus:svg('<path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3m-8 0H5a2 2 0 0 1-2-2v-3"/><circle cx="12" cy="12" r="3"/>'),
  Code:svg('<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"/>'),
  ExternalLink:svg('<path d="M15 3h6v6m0-6-9 9M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>'),
  Download:svg('<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>'),
  X:svg('<path d="m6 6 12 12M6 18 18 6"/>'),
  Copy:svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>')
 };
})();
