/* Explicit URL choices override browser history; private notes never enter URLs. */
(() => {
 const q=new URLSearchParams(location.search),selection={};
 if(q.has('section'))selection.section=q.get('section');if(q.has('pair')&&/^\d+$/.test(q.get('pair')))selection.pair=Number(q.get('pair'));
 if(['one','side'].includes(q.get('view')))selection.view=q.get('view');
 if(['en','bn','ur','gu','cs','both'].includes(q.get('listen')))selection.listen=q.get('listen');
 if([.7,.85,1,1.25,1.5].includes(Number(q.get('speed'))))selection.speed=Number(q.get('speed'));
 for(const name of ['focus','pause','follow'])if(['0','1'].includes(q.get(name)))selection[name]=q.get(name)==='1';
 window.UnityBCInitialSelection=Object.assign(selection,window.UnityBCAttachmentSelection||{});
 document.body.classList.toggle('embed',q.get('embed')==='1');
 document.body.classList.toggle('attachment',Boolean(window.UnityBCAttachmentSelection));
})();
