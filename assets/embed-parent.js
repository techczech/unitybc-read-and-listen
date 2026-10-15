/* Include after reader iframes. Exact origin and window validation is required. */
(() => {
  if(window.UnityBCEmbedParentInstalled)return;
  window.UnityBCEmbedParentInstalled=true;
  const frames=()=>[...document.querySelectorAll('iframe[data-unitybc-reader]')];
  window.addEventListener('message', event => {
    const frame=frames().find(f=>f.contentWindow===event.source&&new URL(f.src,location.href).origin===event.origin);
    if(!frame)return;
    if(event.data?.type==='unitybc-reader-focus'){
      const {top,bottom}=event.data;if(!Number.isFinite(top)||!Number.isFinite(bottom)||top<0||bottom<top||bottom>100000||document.activeElement?.matches('input,textarea,select'))return;
      const rect=frame.getBoundingClientRect(),y=rect.top+top,end=rect.top+bottom;let delta=0;if(y<16)delta=y-16;else if(end>innerHeight-16)delta=end-innerHeight+16;if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:'auto'});return;
    }
    if(event.data?.type!=='unitybc-reader-height'||!Number.isFinite(event.data.height))return;
    const height=Math.ceil(event.data.height);if(height<1||height>100000)return;
    frame.style.height=height+'px';
  });
  for(const frame of frames()){
    const measure=()=>frame.contentWindow.postMessage({type:'unitybc-reader-measure'},new URL(frame.src,location.href).origin);
    frame.addEventListener('load',measure);measure();
  }
})();
