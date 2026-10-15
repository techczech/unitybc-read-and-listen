(() => {
 const data=JSON.parse(document.querySelector('#material-data').textContent),copy=data.companion.copy,offline=Boolean(window.UnityBCAttachmentSelection),q=new URLSearchParams(location.search),embedded=q.get('embed')==='1',audio=document.querySelector('audio');
 const icons=window.UnityBCIcons,site='https://unitybc-read-and-listen.pages.dev';
 function labelled(button,name,label){button.innerHTML=icons[name]+'<span></span>';button.lastElementChild.textContent=label;button.setAttribute('aria-label',label);}
 document.querySelector('.material-heading').append(document.querySelector('.content-toolbar'));
 for(const link of document.querySelectorAll('.site-link,.embed-open')){const label=link.textContent;link.innerHTML=icons.ExternalLink;const text=document.createElement('span');text.textContent=label;link.append(text);}
 const embedButton=document.querySelector('[data-embed-open]');labelled(embedButton,'Code',copy.embed);
 audio.addEventListener('playing',()=>document.querySelector('[data-error]').hidden=true);
 function selection(){return window.UnityBCReader.selection();}
 function selectedURL(embed=false){const route=data.companion.language==='en'&&data.companion.material==='lay-summary'?'/':'/'+data.companion.language+'-'+data.companion.material+'.html',u=new window.URL (offline?route:location.pathname,site),s=selection();for(const key of ['section','pair','view','listen','speed'])u.searchParams.set(key,String(s[key]));for(const key of ['focus','pause','follow'])u.searchParams.set(key,s[key]?'1':'0');if(embed)u.searchParams.set('embed','1');return u;}
 function update(){
  const u=selectedURL(embedded);if(!offline){try{if(location.pathname+location.search!==u.pathname+u.search)history.replaceState(null,'',u.pathname+u.search)}catch{}}
  document.querySelector('.embed-open').href=selectedURL(false).href;
 }
 window.addEventListener('unitybc:state-change',update);update();
 if(offline){const p=document.createElement('p');p.className='attachment-notice';p.textContent=copy.offlineHelp;document.querySelector('.companion-header').after(p);return;}
 for(const link of document.querySelectorAll('[data-language-code],[data-material]'))link.addEventListener('click',()=>{
  const s=selection(),u=new window.URL (link.href);audio.pause();
  for(const key of ['view','listen','speed'])u.searchParams.set(key,String(s[key]));for(const key of ['focus','pause','follow'])u.searchParams.set(key,s[key]?'1':'0');
  if(embedded)u.searchParams.set('embed','1');
  if(link.dataset.languageCode){const target=link.dataset.languageCode;u.searchParams.set('section',s.section);u.searchParams.set('pair',s.pair);if(target==='en'){u.searchParams.set('view','one');u.searchParams.set('listen','en');}else{if(data.companion.language==='en')u.searchParams.set('view','side');u.searchParams.set('listen',s.listen==='both'?'both':target);}}
  link.href=u.href;
 });
 const dialog=document.createElement('dialog');dialog.className='embed-dialog';dialog.innerHTML='<form method="dialog"><h2></h2><button data-close type="submit"></button></form><p data-help></p><label><span></span><textarea rows="8" readonly spellcheck="false"></textarea></label><div class="embed-actions"><button type="button" data-copy></button><button type="button" data-download></button><a data-guide></a></div><p data-embed-status role="status"></p>';
 dialog.querySelector('h2').textContent=copy.embedTitle;dialog.querySelector('[data-help]').textContent=copy.embedHelp;dialog.querySelector('label span').textContent=copy.embedCode;
 labelled(dialog.querySelector('[data-close]'),'X',copy.close);labelled(dialog.querySelector('[data-copy]'),'Copy',copy.copyCode);labelled(dialog.querySelector('[data-download]'),'Download',copy.download);
 const guide=dialog.querySelector('[data-guide]');guide.textContent=copy.guide;guide.href='/embed-guide.html';document.body.append(dialog);
 const textarea=dialog.querySelector('textarea'),status=dialog.querySelector('[data-embed-status]');
 function snippet(){return '<iframe data-unitybc-reader src="'+selectedURL(true).href.replaceAll('&','&amp;')+'" title="'+copy.pageTitle+'" width="100%" height="600" scrolling="no" loading="lazy" style="border:0;width:100%;overflow:hidden;"></iframe>\n<script src="'+site+'/assets/embed-parent.js" defer></scr'+'ipt>';}
 embedButton.onclick=()=>{textarea.value=snippet();status.textContent='';dialog.showModal();};
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 dialog.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(textarea.value);status.textContent=copy.copied;}catch{textarea.select();status.textContent=copy.copyFallback;}};
 function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
 async function checked(url){const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);return response;}
 dialog.querySelector('[data-download]').onclick=async()=>{
  const button=dialog.querySelector('[data-download]');button.disabled=true;status.textContent=copy.downloading;
  try{
   const doc=new DOMParser().parseFromString(await (await checked(location.pathname)).text(),'text/html'),payload={};const urls=[...new Set(data.units.flatMap(u=>Object.entries(u.tracks).filter(([lang])=>data.companion.language!=='en'||lang==='en').map(([,url])=>url)))];
   for(const url of urls)payload[url]=base64(new Uint8Array(await (await checked(url)).arrayBuffer()));
   for(const link of doc.querySelectorAll('link[rel=stylesheet]')){const style=doc.createElement('style');style.textContent=await (await checked(link.getAttribute('href'))).text();link.replaceWith(style);}
   for(const item of doc.querySelectorAll('script[src]')){item.textContent=(await (await checked(item.getAttribute('src'))).text()).replace(/<\/script/gi,'<\\/script');item.removeAttribute('src');}
   const chosen=doc.createElement('script');chosen.textContent='window.UnityBCAttachmentSelection='+JSON.stringify(selection())+';';
   const media=doc.createElement('script');media.id='attachment-media';media.type='application/json';media.textContent=JSON.stringify(payload);
   doc.querySelector('script:not([type])').before(chosen,media);
   for(const link of doc.querySelectorAll('[href]'))if(link.getAttribute('href').startsWith('/'))link.setAttribute('href',site+link.getAttribute('href'));
   const html='<!doctype html>'+doc.documentElement.outerHTML;
   const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='unitybc-'+data.companion.language+'-'+data.companion.material+'.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status.textContent='';
  }catch{status.textContent=copy.downloadError;}finally{button.disabled=false;}
 };
 if(!embedded||window.parent===window)return;
 const parents=new Set(['https://www.ceu.ox.ac.uk','https://embed-check.unitybc-read-and-listen.pages.dev',location.origin]);let parentOrigin=null;
 window.UnityBCFollowTarget=rect=>{if(parentOrigin)window.parent.postMessage({type:'unitybc-reader-focus',top:rect.top+scrollY,bottom:rect.bottom+scrollY},parentOrigin);};
 let frame=null,last=0;const root=document.querySelector('[data-document-root]');
 const measure=()=>{if(!parentOrigin||frame!==null)return;frame=requestAnimationFrame(()=>{frame=null;const height=Math.ceil(root.getBoundingClientRect().height)+16;if(height!==last){last=height;window.parent.postMessage({type:'unitybc-reader-height',height},parentOrigin);}});};
 new ResizeObserver(measure).observe(root);window.addEventListener('resize',measure);document.fonts.ready.then(measure);
 window.addEventListener('message',e=>{if(e.source===window.parent&&parents.has(e.origin)&&e.data?.type==='unitybc-reader-measure'){parentOrigin=e.origin;last=0;measure();}});measure();
})();
