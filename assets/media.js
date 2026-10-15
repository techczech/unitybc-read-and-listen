/* Both distribution formats call this adapter; neither owns a second player. */
window.UnityBCMedia = {
  urls: new Map(),
  resolve(clip) {
    const payload = document.getElementById('attachment-media');
    if (!payload) return new window.URL (clip, location.href).href;
    if (!this.data) this.data = JSON.parse(payload.textContent);
    if (!this.urls.has(clip)) {
      if (!this.data[clip]) throw new Error('Missing attachment recording');
      const bytes = Uint8Array.from(atob(this.data[clip]), c => c.charCodeAt(0));
      this.urls.set(clip, URL.createObjectURL(new Blob([bytes], {type:'audio/mpeg'})));
    }
    return this.urls.get(clip);
  }
};
