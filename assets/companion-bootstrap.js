/* Runs before the reader to preserve deep links without exposing notes in URLs. */
const startQuery = new URLSearchParams(location.search);
window.UnityBCStartSection = startQuery.get('section');
document.body.classList.toggle('embed', startQuery.get('embed') === '1');
