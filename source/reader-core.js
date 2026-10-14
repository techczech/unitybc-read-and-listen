// Shared by the participant and researcher previews; labels remain canonical Markdown copy.
window.UnityBCAudio = {
 icon(button, name, label, icons) {
  button.innerHTML=icons[name];button.classList.add('icon-button');
  button.setAttribute('aria-label',label);button.title=label;
 },
 text(parent, text, alignment, offset=0) {
  if(!alignment){parent.textContent=text;return}
  let cursor=0;
  for(const sentence of alignment.sentences){
   const start=Math.max(0,sentence.charStart-offset),end=Math.min(text.length,sentence.charEnd-offset);
   if(end<=start||start<cursor)continue;
   parent.append(document.createTextNode(text.slice(cursor,start)));
   const span=document.createElement('span');span.textContent=text.slice(start,end);
   span.dataset.sentenceStart=sentence.start;span.dataset.sentenceEnd=sentence.end;
   parent.append(span);cursor=end;
  }
  parent.append(document.createTextNode(text.slice(cursor)));
 },
 highlight(parent, time, enabled) {
  parent.querySelectorAll('[data-sentence-start]').forEach(span=>{
   const current=enabled&&time+.0001>=Number(span.dataset.sentenceStart)&&time<Number(span.dataset.sentenceEnd);
   span.classList.toggle('sentence-reading',current);
   if(current)span.setAttribute('aria-current','true');else span.removeAttribute('aria-current');
  });
 }
};

(() => {
 const data=JSON.parse(document.querySelector('#material-data').textContent),copies=JSON.parse(document.querySelector('#material-copy').textContent),$=s=>document.querySelector(s),audio=$('#study-audio');
 const key='unitybc-material-preview:'+data.id;let state;try{state=JSON.parse(localStorage.getItem(key))}catch{}state={ui:'en',language:'en',index:0,speed:1,positions:{},marks:[],answers:{},...data.defaults,...state};state.index=Math.min(state.index,data.units.length-1);
 let activeKey=null,url=null,pendingSelection=null;const fmt=t=>Math.floor((t||0)/60)+':'+String(Math.floor((t||0)%60)).padStart(2,'0'),copy=()=>copies[state.ui],unit=()=>data.units[state.index];
 function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{$('[data-status]').textContent=copy().saveError}}
 function remember(){if(activeKey){state.positions[activeKey]=audio.currentTime;save()}}
 function pause(){clearTimeout(normalSegmentTimer);if(state.interpreterMode){interpreter.pause();return}remember();audio.pause()}
 function title(u){return u.titles[state.ui]}
 function refreshSpeeds(){$('[data-selection-offer]').setAttribute('aria-label',copy().selectText);const label=copy().speed;$('[data-speed]').setAttribute('aria-label',label);$('.speed-line').setAttribute('aria-label',label);for(const button of document.querySelectorAll('[data-rate]')){const normal=button.dataset.rate==='1';button.setAttribute('aria-pressed',String(Number(button.dataset.rate)===state.speed));button.setAttribute('aria-label',label+' '+button.textContent+(normal?' · '+copy().normal:''));button.title=button.getAttribute('aria-label')}}
 for(const button of document.querySelectorAll('[data-rate]'))button.onclick=()=>{$('[data-speed]').value=button.dataset.rate;$('[data-speed]').dispatchEvent(new Event('change'));refreshSpeeds()};
 const controls=window.UnityBCAudio;
 {const group=$('[data-question-sentence-controls]');group.append($('[data-sentence-back]'),$('[data-listen]'),$('[data-sentence-forward]'));group.hidden=false;$('.inline-playback').prepend(group);}
 let selectingText=false;
 function selectionChanged(){
  if(selectingText||$('[data-selection-offer]').contains(document.activeElement))return;
  const selection=window.getSelection();if(!selection.rangeCount||selection.isCollapsed){closeSelectionOffer();return}
  const content=[$('[data-content]'),$('[data-reference]'),...document.querySelectorAll('[data-pair-text]')].find(el=>el.contains(selection.anchorNode));
  if(!content){closeSelectionOffer();return}
  const range=selection.getRangeAt(0);
  // Keep a drag in its starting passage and language, even if it crosses a column.
  if(!content.contains(range.startContainer))range.setStart(content,0);
  if(!content.contains(range.endContainer))range.setEnd(content,content.childNodes.length);
  const prefix=document.createRange();prefix.selectNodeContents(content);prefix.setEnd(range.startContainer,range.startOffset);
  const text=range.toString();if(!text.trim()){closeSelectionOffer();return}
  const element=range.startContainer.nodeType===Node.TEXT_NODE?range.startContainer.parentElement:range.startContainer,spoken=element.closest('[data-sentence-start]');
  pendingSelection={unit:unit().id,language:content.dataset.language||state.language,text,start:Number(content.dataset.sourceOffset||0)+prefix.toString().length,end:Number(content.dataset.sourceOffset||0)+prefix.toString().length+text.length,time:spoken?Number(spoken.dataset.sentenceStart):null};
  $('[data-mark]').disabled=false;const offer=$('[data-selection-offer]');offer.hidden=false;const bounds=range.getBoundingClientRect(),width=Math.min(320,innerWidth-24);offer.style.width=width+'px';offer.style.left=Math.max(12,Math.min(innerWidth-width-12,bounds.left))+'px';offer.style.top=Math.max(12,Math.min(innerHeight-offer.offsetHeight-12,bounds.bottom+8))+'px';
 }
 function closeSelectionOffer(){$('[data-selection-offer]').hidden=true;$('[data-selection-note]').value='';pendingSelection=null;$('[data-mark]').disabled=true}
 function dismissSelection(){closeSelectionOffer();window.getSelection().removeAllRanges()}
 $('[data-selection-close]').onclick=dismissSelection;
 document.addEventListener('pointerdown',e=>{if(!$('[data-selection-offer]').contains(e.target)){dismissSelection();selectingText=true}});
 document.addEventListener('pointerup',()=>{selectingText=false;selectionChanged()});
 document.addEventListener('pointercancel',()=>{selectingText=false;dismissSelection()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){dismissSelection();e.preventDefault()}});
 document.addEventListener('selectionchange',selectionChanged);
 function paintSavedText(content=$('[data-content]'),language=state.language){const ranges=state.marks.filter(m=>m.unit===unit().id&&m.language===language&&Number.isInteger(m.start)&&m.end>m.start).map(m=>{const base=Number(content.dataset.sourceOffset||0),text=content.textContent,start=text.slice(m.start-base,m.end-base)===m.text?m.start-base:text.indexOf(m.text);return [start,start+m.text.length]}).filter(([start])=>start>=0);if(!ranges.length)return;const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT),nodes=[];let offset=0,node;while(node=walker.nextNode()){nodes.push({node,start:offset,end:offset+node.length});offset+=node.length}for(const item of nodes){const intervals=ranges.map(([a,b])=>[Math.max(a,item.start)-item.start,Math.min(b,item.end)-item.start]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);if(!intervals.length)continue;const merged=[];for(const interval of intervals){const last=merged.at(-1);if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push(interval)}const fragment=document.createDocumentFragment();let cursor=0;for(const [a,b] of merged){fragment.append(document.createTextNode(item.node.textContent.slice(cursor,a)));const mark=document.createElement('mark');mark.className='saved-text';mark.dataset.savedStart=item.start+a+Number(content.dataset.sourceOffset||0);mark.dataset.savedEnd=item.start+b+Number(content.dataset.sourceOffset||0);mark.textContent=item.node.textContent.slice(a,b);fragment.append(mark);cursor=b}fragment.append(document.createTextNode(item.node.textContent.slice(cursor)));item.node.replaceWith(fragment)}}

 function playbackIcons(){if(state.interpreterMode){interpreterPaint();return}const current=activeKey===unit().id+':'+state.language&&!audio.paused;for(const selector of ['[data-listen]'])controls.icon($(selector),current?'Pause':'Play',current?copy().pause:copy().listen,data.icons)}
 function sentenceIndex(){const spans=unit().alignment?.[state.language]?.sentences||[];let index=-1;for(let i=0;i<spans.length;i++){if(audio.currentTime+.0001>=spans[i].start)index=i;else break}return {spans,index}}
 function sentenceButtons(){for(const selector of ['[data-sentence-back]','[data-sentence-forward]'])$(selector).hidden=false;const {spans,index}=sentenceIndex(),ready=activeKey===unit().id+':'+state.language&&Number.isFinite(audio.duration);const position=state.focusView?currentReadingPair():index,total=state.focusView?unit().interpreterPairs.length:spans.length;$('[data-sentence-back]').disabled=!ready||position<=0;$('[data-sentence-forward]').disabled=!ready||position>=total-1||!total}
 function jumpSentence(direction){clearNormalSegmentPause();if(state.interpreterMode){interpreter.skip(direction);return}if(state.focusView){focusSkip(direction);return}const {spans,index}=sentenceIndex();if(!spans.length)return;const target=Math.max(0,Math.min(spans.length-1,index+direction));audio.currentTime=spans[target].start;remember();highlight()}
 function highlight(){if(state.interpreterMode){interpreterPaint();return}sentenceButtons();readingHighlights()}
 function translate(){document.documentElement.lang=state.ui;document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=copy()[el.dataset.i18n]);$('[data-page-title]').textContent=copy()[data.mode==='questionnaire'?'questionnaireTitle':'title'];document.title='UnityBC · '+$('[data-page-title]').textContent;$('[data-unit-select]').setAttribute('aria-label',copy().title);$('[data-seek]').setAttribute('aria-label',copy().progress);playbackIcons();[['[data-sentence-back]','ChevronLeft','previousSentence'],['[data-sentence-forward]','ChevronRight','nextSentence'],['[data-mark]','Bookmark','help']].forEach(([selector,icon,label])=>controls.icon($(selector),icon,copy()[label],data.icons));const markLabel=document.createElement('span');markLabel.textContent=copy().help;$('[data-mark]').append(markLabel);refreshSpeeds();$('[data-ui-language]').value=state.ui;$('[data-content-language]').value=state.language;$('[data-status]').textContent=copy().local}
 function renderMarks(){const target=$('[data-marks-list]');target.replaceChildren();if(!state.marks.length){const p=document.createElement('p');p.textContent=copy().empty;target.append(p)}state.marks.forEach((m,index)=>{const u=data.units.find(u=>u.id===m.unit);if(!u)return;const row=document.createElement('div');row.className='mark-row';const text=document.createElement('span');text.textContent=title(u)+' · '+(data.languageLabels[m.language]);row.append(text);if(m.text){const quote=document.createElement('blockquote');quote.className='mark-excerpt';quote.textContent=m.text;row.append(quote);const noteLabel=document.createElement('label');noteLabel.className='sidebar-note-label';const noteCaption=document.createElement('span');noteCaption.textContent=copy().noteLabel;const note=document.createElement('textarea');note.className='sidebar-note';note.rows=2;note.value=m.note||'';note.setAttribute('aria-label',copy().noteLabel+' · '+title(u));note.oninput=()=>{m.note=note.value;save()};noteLabel.append(noteCaption,note);row.append(noteLabel);const show=document.createElement('button');show.textContent=copy().showPassage;show.onclick=()=>{pause();state.index=data.units.indexOf(u);state.language=m.language;pendingSelection=null;const notePair=Math.max(0,(u.interpreterPairs||[]).findIndex(p=>m.start>=p[m.language].charStart&&m.start<p[m.language].charEnd));if(state.focusView&&!state.interpreterMode)state.positions[u.id+':'+m.language]=u.interpreterPairs[notePair][m.language].start;render();if(state.interpreterMode)interpreter.go(notePair,interpreter.order().indexOf(m.language),false,u.interpreterPairs[notePair][m.language].start);const content=state.interpreterMode||state.focusView?$('[data-interpreter-passages]'):$('[data-content]'),start=state.interpreterMode||state.focusView?m.start:content.textContent.slice(m.start,m.end)===m.text?m.start:content.textContent.indexOf(m.text),mark=[...content.querySelectorAll('.saved-text')].find(el=>(!(state.interpreterMode||state.focusView)||el.closest('[data-pair-text]').dataset.language===m.language)&&Number(el.dataset.savedStart)<=start&&Number(el.dataset.savedEnd)>start);if(mark)mark.scrollIntoView({block:'center',behavior:'smooth'})};row.append(show)}const remove=document.createElement('button');controls.icon(remove,'X',copy().remove,data.icons);remove.onclick=()=>{state.marks.splice(index,1);save();render()};row.append(remove);target.append(row)});$('[data-export]').disabled=!state.marks.length}
 
 function renderReference(){
 const u=unit(),lang=state.language==='en'?data.defaults.language:'en',content=$('[data-reference]');
 content.replaceChildren();content.lang=lang;content.dir=lang==='ur'?'rtl':'ltr';content.dataset.language=lang;
 document.body.classList.toggle('parallel',Boolean(state.parallel));document.body.classList.toggle('english-active',state.language==='en');
 $('[data-reference-column]').hidden=!state.parallel;$('[data-primary-label]').hidden=!state.parallel;
 $('[data-primary-label]').textContent=data.languageLabels[state.language];$('[data-reference-label]').textContent=data.languageLabels[lang];
 $('[data-compare]').textContent=copy()[state.parallel?'singleView':'parallelView'];$('[data-compare]').setAttribute('aria-pressed',String(Boolean(state.parallel)));
 if(!state.parallel)return;
 let referenceCursor=0;function referenceText(el,text){const alignment=u.alignment[lang],offset=alignment.text.indexOf(text,referenceCursor);if(offset>=0){controls.text(el,text,alignment,offset);referenceCursor=offset+text.length}else el.textContent=text}
 if(data.mode==='questionnaire'){
 const f=document.createElement('fieldset'),legend=document.createElement('legend');referenceText(legend,u.question[lang]);f.append(legend);
 const hint=document.createElement('p');hint.className='answer-hint';referenceText(hint,u.help?.[lang]||copies.en[u.type==='checkbox'?'multiHelp':'questionHelp']);f.append(hint);
 u.options[lang].forEach((text,i)=>{const label=document.createElement('label');label.className='answer-option';const input=document.createElement('input');input.type=u.type;input.name=u.id+'-reference';input.value=i;input.checked=(state.answers[u.id]||[]).includes(i);input.onchange=()=>{state.answers[u.id]=u.type==='radio'?[i]:[...f.querySelectorAll('input:checked')].map(x=>Number(x.value));save();render()};const span=document.createElement('span');referenceText(span,text);label.append(input,span);f.append(label)});content.append(f);
 }else u.blocks[lang].forEach(block=>{const el=document.createElement(block.type);referenceText(el,block.text);content.append(el)});
 paintSavedText(content,lang);
 }
 $('[data-compare]').onclick=()=>{state.parallel=!state.parallel;render()};

 /*INTERPRETER_VIEW*/
 function render(){closeSelectionOffer();translate();const u=unit();$('[data-unit-title]').textContent=title(u);$('[data-position]').textContent=copy().position.replace('{number}',state.index+1).replace('{total}',data.units.length);$('[data-unit-select]').replaceChildren(...data.units.map((u,i)=>{const o=document.createElement('option');o.value=i;o.textContent=title(u);return o}));$('[data-unit-select]').value=state.index;$('[data-prev]').disabled=state.index===0;$('[data-next]').disabled=state.index===data.units.length-1;
 pendingSelection=null;$('[data-mark]').disabled=true;const content=$('[data-content]');content.lang=state.language;content.dir=state.language==='ur'?'rtl':'ltr';content.replaceChildren();
 if(data.mode==='questionnaire'){
 let cursor=0;const alignment=u.alignment?.[state.language];function aligned(el,text){const offset=alignment?alignment.text.indexOf(text,cursor):0;if(alignment&&offset>=0){controls.text(el,text,alignment,offset);cursor=offset+text.length}else el.textContent=text}const f=document.createElement('fieldset'),legend=document.createElement('legend');aligned(legend,u.question[state.language]);f.append(legend);const hint=document.createElement('p');hint.className='answer-hint';aligned(hint,u.help?.[state.language]||copy()[u.type==='checkbox'?'multiHelp':'questionHelp']);f.append(hint);
 u.options[state.language].forEach((text,i)=>{const label=document.createElement('label');label.className='answer-option';const input=document.createElement('input');input.type=u.type;input.name=u.id;input.value=i;input.checked=(state.answers[u.id]||[]).includes(i);input.onchange=()=>{state.answers[u.id]=u.type==='radio'?[i]:[...f.querySelectorAll('input:checked')].map(x=>Number(x.value));save();answerStatus();if(state.parallel)render()};const span=document.createElement('span');aligned(span,text);label.append(input,span);f.append(label)});const status=document.createElement('p');status.className='answer-status';status.dataset.answerStatus='';f.append(status);content.append(f);answerStatus();
 }else{let cursor=0;u.blocks[state.language].forEach(block=>{const p=document.createElement(block.type),alignment=u.alignment?.[state.language],offset=alignment?alignment.text.indexOf(block.text,cursor):0;if(alignment&&offset<0)throw Error('Aligned text differs from displayed passage');controls.text(p,block.text,alignment,offset);cursor=offset+block.text.length;content.append(p)})}
 const hasClip=Boolean(u.tracks[state.language]);$('[data-listen]').disabled=!hasClip;$('[data-missing]').hidden=hasClip;$('[data-missing]').textContent=data.mode==='reading'&&state.language==='cs'?copy().textOnly:copy().missing;$('[data-transport]').hidden=activeKey!==u.id+':'+state.language;$('[data-error]').hidden=true;paintSavedText();renderReference();renderInterpreter();renderSections();readerChrome();renderMarks();highlight();save();
 }
 function answerStatus(){const el=$('[data-answer-status]');if(el)el.textContent=(state.answers[unit().id]||[]).length?copy().answered:copy().notAnswered}
 function listen(){if(state.interpreterMode){interpreter.playPause();return}const u=unit(),clip=u.tracks[state.language];if(!clip)return;const next=u.id+':'+state.language;if(activeKey===next){if(audio.paused){if(state.segmentPaused?.key===next)audio.currentTime=normalResumeTime(next);audio.play().catch(showError)}else audio.pause();return}pause();const resumeTime=normalResumeTime(next);activeKey=next;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([Uint8Array.from(atob(clip),c=>c.charCodeAt(0))],{type:'audio/mpeg'}));audio.src=url;audio.playbackRate=state.speed;audio.onloadedmetadata=()=>{audio.currentTime=Math.min(resumeTime,Math.max(0,audio.duration-.2));audio.playbackRate=state.speed;highlight();playbackIcons()};$('[data-transport]').hidden=false;audio.play().catch(showError)}
 function showError(){$('[data-error]').hidden=false;$('[data-error]').textContent=copy().error}
 function navigate(i){clearNormalSegmentPause();if(state.interpreterMode){interpreter.leave();activeKey=null}else pause();state.index=i;render()}
 $('[data-prev]').onclick=()=>navigate(Math.max(0,state.index-1));$('[data-next]').onclick=()=>navigate(Math.min(data.units.length-1,state.index+1));$('[data-unit-select]').onchange=e=>navigate(Number(e.target.value));$('[data-ui-language]').onchange=e=>{state.ui=e.target.value;render()};$('[data-content-language]').onchange=e=>chooseListening(e.target.value==='en'?'en':'target');$('[data-listen]').onclick=listen;$('[data-sentence-back]').onclick=()=>jumpSentence(-1);$('[data-sentence-forward]').onclick=()=>jumpSentence(1);$('[data-seek]').oninput=e=>{clearNormalSegmentPause();if(state.interpreterMode)interpreter.seek(Number(e.target.value));else audio.currentTime=Number(e.target.value)};$('[data-speed]').value=state.speed;$('[data-speed]').onchange=e=>{state.speed=Number(e.target.value);audio.playbackRate=state.speed;if(state.interpreterMode)interpreter.arm();else normalSegmentArm();save()};
 $('[data-mark]').onpointerdown=e=>e.preventDefault();$('[data-mark]').onclick=()=>{selectionChanged();if(!pendingSelection)return;const m={...pendingSelection,note:$('[data-selection-note]').value.trim(),createdAt:new Date().toISOString()};state.marks.push(m);state.sidebarCollapsed=false;save();window.getSelection().removeAllRanges();render();$('.marks').open=true;$('[data-status]').textContent=copy().markSaved};$('[data-export]').onclick=()=>{const link=document.createElement('a'),blob=URL.createObjectURL(new Blob([JSON.stringify({format:'unitybc-material-design-marks',demoOnly:true,packageId:data.id,marks:state.marks},null,2)],{type:'application/json'}));link.href=blob;link.download=data.id+'-marks.json';link.click();setTimeout(()=>URL.revokeObjectURL(blob),1000)};
 audio.ontimeupdate=()=>{if(!state.interpreterMode)normalSegmentArm();if(state.interpreterMode){interpreter.update();return}highlight();$('[data-clock]').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);$('[data-seek]').max=audio.duration||1;$('[data-seek]').value=audio.currentTime;remember()};audio.onplay=()=>{playbackIcons();highlight();normalSegmentArm()};audio.onpause=()=>{clearTimeout(normalSegmentTimer);if(state.interpreterMode){interpreterPaint();return}playbackIcons();highlight();remember()};audio.onseeked=()=>{highlight();normalSegmentArm()};audio.onended=()=>{if(state.interpreterMode){interpreter.advance();return}state.completed||={};state.completed[unit().id]=true;renderSections();$('[data-section-end]').hidden=false;playbackIcons();highlight()};audio.onerror=showError;window.addEventListener('pagehide',pause);render();
})();
