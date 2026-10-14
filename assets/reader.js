/* Playback of explicit meaning pairs; this module never guesses alignments. */
window.UnityBCInterpreter=class {
 constructor({data,state,audio,save,copy,onTrack,onChange,onComplete}){Object.assign(this,{data,state,audio,save,copy,onTrack,onChange,onComplete});this.urls=new Map();this.token=0;this.timer=null;this.running=false;this.waiting=false;this.unitId=null;if(state.interpreterOrderVersion!==2){for(const p of Object.values(state.interpreterPositions||{})){p.phase=0;p.time=null;p.done=false}state.interpreterFirst="en";state.interpreterOrderVersion=2;save()}}
 unit(){return this.data.units[this.state.index]}
 pairs(){return this.unit().interpreterPairs||[]}
 position(){const id=this.unit().id;this.state.interpreterPositions||={};return this.state.interpreterPositions[id]||=( {pair:0,phase:0,time:null,done:false} )}
 order(){return ['en',this.data.defaults.language]}
 segment(){return this.pairs()[this.position().pair]?.[this.order()[this.position().phase]]}
 clear(){clearTimeout(this.timer);this.timer=null;this.token++;}
 persist(){if(!this.waiting&&this.unitId===this.unit().id&&Number.isFinite(this.audio.currentTime))this.position().time=this.audio.currentTime;this.save()}
 pause(){this.persist();this.running=false;this.clear();this.audio.pause();this.onChange()}
 leave(){this.pause();this.waiting=false;this.unitId=null;for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();}
 playPause(){if(this.running){this.pause();return}const p=this.position();if(p.segmentEnded&&!p.done){p.pair++;p.phase=0;p.time=null;p.segmentEnded=false}if(p.done){p.pair=0;p.phase=0;p.time=null;p.done=false}this.go(p.pair,p.phase,true,p.time)}
 go(pair,phase=0,autoplay=true,resume=null){
 this.clear();const token=this.token;this.running=false;this.audio.pause();this.waiting=false;const p=this.position();p.pair=Math.max(0,Math.min(this.pairs().length-1,pair));p.phase=phase;p.done=false;p.segmentEnded=false;this.unitId=this.unit().id;const lang=this.order()[phase],s=this.segment();if(!s)return;
 const key=this.unitId+':'+lang;if(!this.urls.has(key))this.urls.set(key,new URL(this.unit().tracks[lang],location.href).href);
 p.time=resume===null?s.start:Math.max(s.start,Math.min(s.end,resume));this.onTrack(key);this.onChange();const targetTime=p.time;const ready=()=>{if(token!==this.token)return;this.audio.currentTime=targetTime;this.audio.playbackRate=this.state.speed;this.running=autoplay;this.save();this.onChange();if(autoplay)this.audio.play().then(()=>{if(token===this.token)this.arm()}).catch(()=>{if(token===this.token){this.running=false;this.onChange()}})};
 const url=this.urls.get(key);if(this.audio.src===url&&this.audio.readyState>=1)ready();else{this.audio.onloadedmetadata=ready;this.audio.src=url;this.audio.load()}
 }
 arm(){if(this.waiting)return;clearTimeout(this.timer);if(!this.running)return;const s=this.segment(),token=this.token;if(!s)return;this.timer=setTimeout(()=>{if(token===this.token)this.advance()},Math.max(0,(s.end-this.audio.currentTime)/this.audio.playbackRate*1000));}
 advance(){if(!this.running||this.waiting)return;this.clear();this.audio.pause();const p=this.position();if(p.phase===1&&p.pair===this.pairs().length-1){p.done=true;p.time=this.segment().end;this.running=false;this.save();this.onComplete();this.onChange();return}
 if(p.phase===1&&this.state.pauseAfterSegment){this.running=false;this.waiting=false;p.segmentEnded=true;p.time=Math.max(this.segment().start,this.segment().end-.001);this.audio.currentTime=p.time;this.save();this.onChange();return}
 if(p.phase===0)p.phase=1;else{p.pair++;p.phase=0}p.time=this.segment().start;this.waiting=true;this.save();this.onChange();const token=this.token;this.timer=setTimeout(()=>{if(token!==this.token||!this.running)return;this.go(p.pair,p.phase,true,p.time)},650);
 }
 skip(direction){const p=this.position();this.go(p.pair+direction,0,this.running)}
 repeat(){this.go(this.position().pair,0,true)}
 seek(value){const spans=this.pairs().map(p=>p[this.order()[this.position().phase]]);let index=spans.findIndex(s=>value>=s.start&&value<s.end);if(index<0)index=Math.max(0,spans.findLastIndex(s=>value>=s.start));const p=this.position();this.go(index,p.phase,this.running,value)}
 changeOrder(){return}
 update(){if(this.running&&!this.waiting)this.persist();this.onChange()}
};

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
 const key='unitybc-material-preview:'+data.id;let state;try{state=JSON.parse(localStorage.getItem(key))}catch{}state={ui:'en',language:'en',index:0,speed:1,positions:{},marks:[],answers:{},...data.defaults,language:data.initialLanguage||data.defaults.language,...state};state.index=Math.max(0,Math.min(state.index,data.units.length-1));if(window.UnityBCStartSection!==null){const i=data.units.findIndex(u=>u.id===window.UnityBCStartSection);if(i>=0)state.index=i;}
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

 /* Inserted inside the participant reader closure, with its existing notes API. */
 if(state.interpreterMode)state.parallel=true; const interpreter=new window.UnityBCInterpreter({data,state,audio,save,copy,onTrack:key=>{activeKey=key},onChange:interpreterPaint,onComplete:()=>{state.completed||={};state.completed[unit().id]=true;save();renderSections()}});
 function interpreterPaint(){if(!state.interpreterMode)return;const p=interpreter.position(),order=interpreter.order(),lang=order[p.phase],pairs=interpreter.pairs();
 const status=p.done?copy().sectionComplete:(interpreter.running?(interpreter.waiting?copy().nextLanguage:copy().nowReading):copy().pausedReading)+' '+data.languageLabels[lang];if($('[data-now-reading]').textContent!==status)$('[data-now-reading]').textContent=status;$('[data-pair-select]').value=p.pair;
 $('[data-pair-progress]').textContent=copy().pairProgress.replace('{number}',p.pair+1).replace('{total}',pairs.length);$('[data-section-end]').hidden=!p.done;
 controls.icon($('[data-listen]'),interpreter.running?'Pause':'Play',interpreter.running?copy().pause:copy().listen,data.icons);
 for(const el of document.querySelectorAll('[data-pair-card]')){const current=Number(el.dataset.pairCard)===p.pair;el.hidden=Boolean(state.focusView&&!current);el.classList.toggle('pair-current',current);for(const text of el.querySelectorAll('[data-pair-text]')){text.hidden=!state.parallel&&text.dataset.language!==state.language;text.previousElementSibling.hidden=text.hidden;const speaking=current&&text.dataset.language===lang&&!p.done&&!interpreter.waiting;text.classList.toggle('pair-speaking',speaking);controls.highlight(text,activeKey===unit().id+':'+lang?audio.currentTime:(p.time??pairs[p.pair][lang].start),speaking);for(const span of text.querySelectorAll('[data-sentence-start]'))span.classList.toggle('translation-partner',current&&!p.done&&text.dataset.language!==lang)}}
 $('[data-sentence-back]').hidden=false;$('[data-sentence-forward]').hidden=false;$('[data-sentence-back]').disabled=p.pair===0;$('[data-sentence-forward]').disabled=p.pair>=pairs.length-1;
 $('[data-sentence-back]').setAttribute('aria-label',copy().previousPair);$('[data-sentence-forward]').setAttribute('aria-label',copy().nextPair);$('[data-sentence-back]').title=copy().previousPair;$('[data-sentence-forward]').title=copy().nextPair;
 $('[data-transport]').hidden=false;$('[data-seek]').max=audio.duration||1;$('[data-seek]').value=audio.currentTime;requestReadingFollow();$('[data-clock]').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);
 }
 function renderInterpreter(){const target=$('[data-interpreter-passages]');target.replaceChildren();target.hidden=!(state.interpreterMode||state.focusView);$('.reading-columns').hidden=Boolean(state.interpreterMode||state.focusView);$('[data-interpreter-tools]').hidden=!(state.interpreterMode||state.focusView);$('[data-interpreter-order]').closest('label').hidden=!state.interpreterMode; $('[data-content-language]').closest('label').hidden=false;
  $('[data-reading-mode]').value=state.parallel?'side':'one';$('[data-audio-mode]').value=state.interpreterMode?'interpreter':'single';$('[data-audio-mode] option[value=interpreter]').disabled=!state.parallel||!unit().interpreterPairs?.length;
 document.body.classList.toggle('interpreter-mode',Boolean(state.interpreterMode));$('[data-section-end]').hidden=!state.completed?.[unit().id];
 const labelBar=$('[data-paired-labels]');labelBar.hidden=!(state.interpreterMode||state.focusView)||Boolean(state.focusView);$('[data-paired-label-en]').hidden=!state.parallel&&state.language!=='en';$('[data-paired-label-target]').hidden=!state.parallel&&state.language=== 'en';$('[data-paired-label-en]').textContent=data.languageLabels.en;$('[data-paired-label-target]').textContent=data.languageLabels[data.defaults.language];if(!(state.interpreterMode||state.focusView))return;const u=unit(),lang=data.defaults.language;$('[data-interpreter-order]').textContent=data.languageLabels.en+' → '+data.languageLabels[lang];$('[data-follow-reading]').checked=state.followInterpreter!==false;controls.icon($('[data-repeat-pair]'),'RotateCcw',copy().repeatPair,data.icons);$('[data-pair-select]').setAttribute('aria-label',copy().passage);$('[data-pair-select]').replaceChildren(...u.interpreterPairs.map((pair,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+' / '+u.interpreterPairs.length;return o}));
 u.interpreterPairs.forEach((pair,i)=>{const card=document.createElement('section');card.className='interpreter-pair';card.dataset.pairCard=i;if(data.mode==='questionnaire'){const expected=u.text.en.slice(pair.en.charStart,pair.en.charEnd).trim(),option=u.options.en.findIndex(text=>text.trim()===expected);if(option>=0){const input=document.createElement('input');input.type=u.type;input.name=u.id+'-paired';input.value=option;input.checked=(state.answers[u.id]||[]).includes(option);input.setAttribute('aria-label',u.options[state.language][option]);input.onchange=()=>{state.answers[u.id]=u.type==='radio'?[option]:[...target.querySelectorAll('input:checked')].map(el=>Number(el.value));save();render()};card.append(input)}}for(const language of ['en',lang]){const label=document.createElement('h3');label.textContent=data.languageLabels[language];card.append(label);const text=document.createElement('div');text.dataset.pairText='';text.dataset.language=language;text.dataset.sourceOffset=pair[language].charStart;text.lang=language;text.dir=language==='ur'?'rtl':'ltr';controls.text(text,u.text[language].slice(pair[language].charStart,pair[language].charEnd),u.alignment[language],pair[language].charStart);card.append(text);paintSavedText(text,language)}target.append(card)});
 if(state.interpreterMode)interpreterPaint();else focusPaint();
 }
 function renderSections(){$('.part-nav').hidden=data.units.length===1;$('[data-position]').hidden=data.units.length===1;const list=$('[data-section-list]');list.replaceChildren();$('[data-section-summary]').textContent=copy().sections+' · '+(state.index+1)+' / '+data.units.length;
 data.units.forEach((u,i)=>{const button=document.createElement('button');button.type='button';button.textContent=(i+1)+'. '+title(u)+(state.completed?.[u.id]?' ✓':'');button.dataset.sectionIndex=i;button.setAttribute('aria-current',i===state.index?'true':'false');button.onclick=()=>{$('[data-sections]').open=false;navigate(i)};list.append(button)});
 const next=$('[data-end-next]');next.disabled=state.index===data.units.length-1;next.textContent=copy().next;next.onclick=()=>navigate(state.index+1);
 }
 function chooseDisplay(view){
  if(view==='one'&&state.interpreterMode){const pair=interpreter.position().pair;interpreter.leave();state.interpreterMode=false;activeKey=null;state.positions[unit().id+':'+state.language]=unit().interpreterPairs[pair][state.language].start}
  state.parallel=view==='side';render();
 }
 function chooseListening(choice){clearNormalSegmentPause();
  const both=choice==='both';if(both&&!state.parallel)return;
  const language=choice==='en'?'en':data.defaults.language;if(both===Boolean(state.interpreterMode)&&(both||language===state.language))return;
  const pair=state.interpreterMode?interpreter.position().pair:currentReadingPair();
  if(state.interpreterMode)interpreter.leave();else pause();activeKey=null;
  state.interpreterMode=both;if(!both){state.language=language;state.positions[unit().id+':'+language]=unit().interpreterPairs[pair][language].start}
  render();if(both)interpreter.go(pair,0,false);
 }
 $('[data-reading-mode]').onchange=e=>chooseDisplay(e.target.value);
 $('[data-audio-mode]').onchange=e=>chooseListening(e.target.value==='interpreter'?'both':state.language==='en'?'en':'target');
 for(const button of document.querySelectorAll('[data-display-view]'))button.onclick=()=>chooseDisplay(button.dataset.displayView);
 for(const button of document.querySelectorAll('[data-listen-choice]'))button.onclick=()=>chooseListening(button.dataset.listenChoice);
 function readerChoices(){
  $('[data-listen-choices]').setAttribute('aria-label',copy().listenTo);$('[data-display-choices]').setAttribute('aria-label',copy().displayOptions);
  for(const button of document.querySelectorAll('[data-listen-choice]')){const choice=button.dataset.listenChoice,label=choice==='both'?copy().bothLanguages:data.languageLabels[choice==='en'?'en':data.defaults.language];controls.icon(button,choice==='both'?'Languages':'Headphones',label,data.icons);button.classList.remove('icon-button');const text=document.createElement('span');text.textContent=label;button.append(text);button.setAttribute('aria-pressed',String(choice==='both'?Boolean(state.interpreterMode):!state.interpreterMode&&state.language===(choice==='en'?'en':data.defaults.language)));button.disabled=choice==='both'&&(!state.parallel||!unit().interpreterPairs?.length);button.title=choice==='both'?copy().bothHint:copy().listenTo+' '+label}
  for(const button of document.querySelectorAll('[data-display-view]')){const side=button.dataset.displayView==='side',label=copy()[side?'sideBySide':'oneLanguage'];controls.icon(button,side?'Columns':'Panel',label,data.icons);button.classList.remove('icon-button');const text=document.createElement('span');text.textContent=label;button.append(text);button.setAttribute('aria-pressed',String(side===Boolean(state.parallel)))}
 }
 $('[data-repeat-pair]').onclick=()=>{if(state.interpreterMode)interpreter.repeat();else normalSeek(unit().interpreterPairs[currentReadingPair()][state.language].start,true)};

 $('[data-pair-select]').onchange=e=>{if(state.interpreterMode)interpreter.go(Number(e.target.value),0,interpreter.running);else normalSeek(unit().interpreterPairs[Number(e.target.value)][state.language].start)};$('[data-follow-reading]').onchange=e=>{state.followInterpreter=e.target.checked;save()};

/* Visual views do not change playback. Only an actual audio-mode change stops it. */
 function currentReadingPair(){const u=unit(),lang=state.language,key=u.id+':'+lang,time=activeKey===key?audio.currentTime:state.positions[key]||0;let index=(u.interpreterPairs||[]).findIndex(p=>time>=p[lang].start&&time<p[lang].end);if(index<0)index=Math.max(0,(u.interpreterPairs||[]).findLastIndex(p=>time>=p[lang].start));return index}
 function normalSeek(time,autoplay=false){clearNormalSegmentPause();const key=unit().id+':'+state.language;if(activeKey===key){audio.currentTime=time;remember();if(autoplay)audio.play().catch(showError);highlight()}else{state.positions[key]=time;save();if(autoplay)listen();else focusPaint()}}
 function readingHighlights(){const u=unit(),lang=state.language,key=u.id+':'+lang,loaded=activeKey===key,time=loaded?audio.currentTime:state.positions[key],enabled=loaded||Number.isFinite(time);controls.highlight($('[data-content]'),time||0,enabled);const ref=$('[data-reference]');controls.highlight(ref,0,false);const paired=u.interpreterPairs?.[currentReadingPair()],other=lang==='en'?data.defaults.language:'en';for(const span of ref.querySelectorAll('[data-sentence-start]'))span.classList.toggle('translation-partner',Boolean(enabled&&paired&&Number(span.dataset.sentenceStart)>=paired[other].start-.001&&Number(span.dataset.sentenceEnd)<=paired[other].end+.001));if(state.focusView)focusPaint();requestReadingFollow()}
 function focusPaint(){if(state.interpreterMode||!state.focusView)return;const u=unit(),pair=currentReadingPair(),lang=state.language,key=u.id+':'+lang,time=activeKey===key?audio.currentTime:state.positions[key],active=activeKey===key||Number.isFinite(time),segment=u.interpreterPairs[pair];$('[data-pair-progress]').textContent=copy().pairProgress.replace('{number}',pair+1).replace('{total}',u.interpreterPairs.length);$('[data-pair-select]').value=pair;$('[data-now-reading]').textContent=active?(audio.paused?copy().pausedReading:copy().nowReading)+' '+data.languageLabels[lang]:data.languageLabels[lang];for(const card of document.querySelectorAll('[data-pair-card]')){const current=Number(card.dataset.pairCard)===pair;card.hidden=!current;card.classList.toggle('pair-current',current);for(const text of card.querySelectorAll('[data-pair-text]')){const show=state.parallel||text.dataset.language===lang;text.hidden=!show;text.previousElementSibling.hidden=!show;const speaking=current&&text.dataset.language===lang&&active;text.classList.toggle('pair-speaking',speaking);controls.highlight(text,time||0,speaking);for(const span of text.querySelectorAll('[data-sentence-start]'))span.classList.toggle('translation-partner',current&&active&&text.dataset.language!==lang)}}sentenceButtons();}
 function focusSkip(direction){const i=Math.max(0,Math.min(unit().interpreterPairs.length-1,currentReadingPair()+direction));normalSeek(unit().interpreterPairs[i][state.language].start)}
 function readerChrome(){segmentModePaint();readerChoices();requestReadingFollow();$('[data-reader-section-actions]').hidden=false;$('[data-prev]').hidden=data.units.length===1;$('[data-next]').hidden=data.units.length===1;$('[data-prev]').setAttribute('aria-label',copy().previous);$('[data-next]').setAttribute('aria-label',copy().next);document.body.classList.toggle('focus-view',Boolean(state.focusView));document.body.classList.toggle('sidebar-collapsed',Boolean(state.sidebarCollapsed));$('[data-focus-view]').setAttribute('aria-pressed',String(Boolean(state.focusView)));$('[data-sidebar-toggle]').setAttribute('aria-expanded',String(!state.sidebarCollapsed));$('[data-sidebar-toggle]').title=copy()[state.sidebarCollapsed?'showSidebar':'hideSidebar'];$('[data-sidebar-toggle]').textContent=state.sidebarCollapsed?'‹':copy().hideSidebar;$('[data-sidebar-toggle]').setAttribute('aria-label',copy()[state.sidebarCollapsed?'showSidebar':'hideSidebar']);$('[data-sidebar-body]').hidden=Boolean(state.sidebarCollapsed);$('[data-rail-title]').textContent=copy().sections;const rail=$('[data-rail-sections]');rail.replaceChildren();data.units.forEach((u,i)=>{const button=document.createElement('button');button.type='button';button.textContent=(i+1)+'. '+title(u);button.setAttribute('aria-current',i===state.index?'page':'false');button.onclick=()=>navigate(i);rail.append(button)});$('.section-rail').hidden=data.units.length===1;document.body.classList.toggle('single-section',data.units.length===1);}
 $('[data-focus-view]').onclick=()=>{state.focusView=!state.focusView;render()};$('[data-sidebar-toggle]').onclick=()=>{state.sidebarCollapsed=!state.sidebarCollapsed;readerChrome();save()};

 $('[data-round-transport]').append($('[data-question-sentence-controls]'));$('[data-round-speed]').append($('.speed-line'));$('[data-reader-section-actions]').append($('[data-prev]'),$('[data-next]'));

 // Keep the current line in the unobscured reading area, rather than remembering
 // only a passage number across DOM replacement and changes in column height.
 let readingFollowFrame=null;
 function requestReadingFollow(){
  if(readingFollowFrame!==null)return;
  readingFollowFrame=requestAnimationFrame(()=>{
   readingFollowFrame=null;if(state.followInterpreter===false||selectingText||!window.getSelection().isCollapsed||document.activeElement?.matches('textarea'))return;
   const candidates=[...document.querySelectorAll('.sentence-reading')],line=candidates.find(el=>el.getClientRects().length);
   const fallback=state.interpreterMode?document.querySelector('[data-pair-card="'+interpreter.position().pair+'"]'):null;
   const target=line||fallback;if(!target||!target.getClientRects().length)return;
   const rect=line?line.getBoundingClientRect():target.getBoundingClientRect(),toolbar=$('.content-toolbar').getBoundingClientRect(),footer=$('.reader-playback').getBoundingClientRect();
   const toolbarPosition=getComputedStyle($('.content-toolbar')).position;const top=['sticky','fixed'].includes(toolbarPosition)?Math.max(16,toolbar.bottom+18):16,bottom=Math.min(innerHeight-16,footer.top-18);if(bottom<=top+30)return;
   let delta=0;if(rect.height>bottom-top||rect.top<top)delta=rect.top-top;else if(rect.bottom>bottom)delta=rect.bottom-bottom;
   if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:'auto'});
  });
 }

 window.addEventListener('resize',requestReadingFollow);

 const hiddenAudioState=document.createElement('div');hiddenAudioState.hidden=true;hiddenAudioState.setAttribute('aria-hidden','true');hiddenAudioState.dataset.hiddenAudioState='';hiddenAudioState.append($('[data-transport]'));$('.content-panel').append(hiddenAudioState);
 const sectionActions=$('[data-reader-section-actions]');sectionActions.insertBefore($('[data-reader-details]'),$('[data-next]'));$('[data-reader-playback]').append(sectionActions);$('[data-reader-details]').prepend($('[data-interpreter-tools]'));$('[data-reader-details]').append($('[data-missing]'),$('[data-error]'));
 let normalSegmentTimer=null;
 function clearNormalSegmentPause(){clearTimeout(normalSegmentTimer);normalSegmentTimer=null;state.segmentPaused=null}
 function normalResumeTime(key){const stop=state.segmentPaused;if(stop?.key===key){const segment=unit().interpreterPairs[stop.pair+1]?.[state.language];state.segmentPaused=null;if(segment){state.positions[key]=segment.start;save();return segment.start}}return state.positions[key]||0}
 function normalSegmentArm(){
  clearTimeout(normalSegmentTimer);normalSegmentTimer=null;
  if(state.interpreterMode||!state.pauseAfterSegment||audio.paused||activeKey!==unit().id+':'+state.language)return;
  const key=activeKey,pair=currentReadingPair(),segment=unit().interpreterPairs[pair]?.[state.language];if(!segment)return;
  normalSegmentTimer=setTimeout(()=>{
   if(state.interpreterMode||!state.pauseAfterSegment||audio.paused||activeKey!==key)return;
   if(pair===unit().interpreterPairs.length-1)return;
   audio.pause();audio.currentTime=Math.max(segment.start,segment.end-.001);state.segmentPaused={key,pair};remember();highlight();
  },Math.max(0,(segment.end-audio.currentTime)/audio.playbackRate*1000));
 }
 function segmentModePaint(){const button=$('[data-segment-mode]'),stop=Boolean(state.pauseAfterSegment),label=copy()[stop?'pauseEachSegment':'playThrough'];controls.icon(button,stop?'Pause':'Play',label,data.icons);button.classList.remove('icon-button');const span=document.createElement('span');span.className='segment-mode-label';span.textContent=label;const short=document.createElement('span');short.className='segment-mode-short';short.setAttribute('aria-hidden','true');short.textContent=copy()[stop?'pauseSegmentShort':'playThrough'];button.append(span,short);button.setAttribute('aria-pressed',String(stop));button.title=copy()[stop?'switchPlayThrough':'switchPauseSegments']}
 $('[data-segment-mode]').onclick=()=>{state.pauseAfterSegment=!state.pauseAfterSegment;save();segmentModePaint();normalSegmentArm()};

 function render(){closeSelectionOffer();translate();const u=unit();$('[data-unit-title]').textContent=title(u);$('[data-position]').textContent=copy().position.replace('{number}',state.index+1).replace('{total}',data.units.length);$('[data-unit-select]').replaceChildren(...data.units.map((u,i)=>{const o=document.createElement('option');o.value=i;o.textContent=title(u);return o}));$('[data-unit-select]').value=state.index;$('[data-prev]').disabled=state.index===0;$('[data-next]').disabled=state.index===data.units.length-1;
 pendingSelection=null;$('[data-mark]').disabled=true;const content=$('[data-content]');content.lang=state.language;content.dir=state.language==='ur'?'rtl':'ltr';content.replaceChildren();
 if(data.mode==='questionnaire'){
 let cursor=0;const alignment=u.alignment?.[state.language];function aligned(el,text){const offset=alignment?alignment.text.indexOf(text,cursor):0;if(alignment&&offset>=0){controls.text(el,text,alignment,offset);cursor=offset+text.length}else el.textContent=text}const f=document.createElement('fieldset'),legend=document.createElement('legend');aligned(legend,u.question[state.language]);f.append(legend);const hint=document.createElement('p');hint.className='answer-hint';aligned(hint,u.help?.[state.language]||copy()[u.type==='checkbox'?'multiHelp':'questionHelp']);f.append(hint);
 u.options[state.language].forEach((text,i)=>{const label=document.createElement('label');label.className='answer-option';const input=document.createElement('input');input.type=u.type;input.name=u.id;input.value=i;input.checked=(state.answers[u.id]||[]).includes(i);input.onchange=()=>{state.answers[u.id]=u.type==='radio'?[i]:[...f.querySelectorAll('input:checked')].map(x=>Number(x.value));save();answerStatus();if(state.parallel)render()};const span=document.createElement('span');aligned(span,text);label.append(input,span);f.append(label)});const status=document.createElement('p');status.className='answer-status';status.dataset.answerStatus='';f.append(status);content.append(f);answerStatus();
 }else{let cursor=0;u.blocks[state.language].forEach(block=>{const p=document.createElement(block.type),alignment=u.alignment?.[state.language],offset=alignment?alignment.text.indexOf(block.text,cursor):0;if(alignment&&offset<0)throw Error('Aligned text differs from displayed passage');controls.text(p,block.text,alignment,offset);cursor=offset+block.text.length;content.append(p)})}
 const hasClip=Boolean(u.tracks[state.language]);$('[data-listen]').disabled=!hasClip;$('[data-missing]').hidden=hasClip;$('[data-missing]').textContent=data.mode==='reading'&&state.language==='cs'?copy().textOnly:copy().missing;$('[data-transport]').hidden=activeKey!==u.id+':'+state.language;$('[data-error]').hidden=true;paintSavedText();renderReference();renderInterpreter();renderSections();readerChrome();renderMarks();highlight();save();
 }
 function answerStatus(){const el=$('[data-answer-status]');if(el)el.textContent=(state.answers[unit().id]||[]).length?copy().answered:copy().notAnswered}
 function listen(){if(state.interpreterMode){interpreter.playPause();return}const u=unit(),clip=u.tracks[state.language];if(!clip)return;const next=u.id+':'+state.language;if(activeKey===next){if(audio.error)audio.load();if(audio.paused){if(state.segmentPaused?.key===next)audio.currentTime=normalResumeTime(next);audio.play().catch(showError)}else audio.pause();return}pause();const resumeTime=normalResumeTime(next);activeKey=next;if(url)URL.revokeObjectURL(url);url=new URL(clip,location.href).href;audio.src=url;audio.playbackRate=state.speed;audio.onloadedmetadata=()=>{audio.currentTime=Math.min(resumeTime,Math.max(0,audio.duration-.2));audio.playbackRate=state.speed;highlight();playbackIcons()};$('[data-transport]').hidden=false;audio.play().catch(showError)}
 function showError(){$('[data-error]').hidden=false;$('[data-error]').textContent=copy().error}
 function navigate(i){clearNormalSegmentPause();if(state.interpreterMode){interpreter.leave();activeKey=null}else pause();state.index=i;render()}
 $('[data-prev]').onclick=()=>navigate(Math.max(0,state.index-1));$('[data-next]').onclick=()=>navigate(Math.min(data.units.length-1,state.index+1));$('[data-unit-select]').onchange=e=>navigate(Number(e.target.value));$('[data-ui-language]').onchange=e=>{state.ui=e.target.value;render()};$('[data-content-language]').onchange=e=>chooseListening(e.target.value==='en'?'en':'target');$('[data-listen]').onclick=listen;$('[data-sentence-back]').onclick=()=>jumpSentence(-1);$('[data-sentence-forward]').onclick=()=>jumpSentence(1);$('[data-seek]').oninput=e=>{clearNormalSegmentPause();if(state.interpreterMode)interpreter.seek(Number(e.target.value));else audio.currentTime=Number(e.target.value)};$('[data-speed]').value=state.speed;$('[data-speed]').onchange=e=>{state.speed=Number(e.target.value);audio.playbackRate=state.speed;if(state.interpreterMode)interpreter.arm();else normalSegmentArm();save()};
 $('[data-mark]').onpointerdown=e=>e.preventDefault();$('[data-mark]').onclick=()=>{selectionChanged();if(!pendingSelection)return;const m={...pendingSelection,note:$('[data-selection-note]').value.trim(),createdAt:new Date().toISOString()};state.marks.push(m);state.sidebarCollapsed=false;save();window.getSelection().removeAllRanges();render();$('.marks').open=true;$('[data-status]').textContent=copy().markSaved};$('[data-export]').onclick=()=>{const link=document.createElement('a'),blob=URL.createObjectURL(new Blob([JSON.stringify({format:'unitybc-material-design-marks',demoOnly:true,packageId:data.id,marks:state.marks},null,2)],{type:'application/json'}));link.href=blob;link.download=data.id+'-marks.json';link.click();setTimeout(()=>URL.revokeObjectURL(blob),1000)};
 audio.ontimeupdate=()=>{if(!state.interpreterMode)normalSegmentArm();if(state.interpreterMode){interpreter.update();return}highlight();$('[data-clock]').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);$('[data-seek]').max=audio.duration||1;$('[data-seek]').value=audio.currentTime;remember()};audio.onplay=()=>{playbackIcons();highlight();normalSegmentArm()};audio.onpause=()=>{clearTimeout(normalSegmentTimer);if(state.interpreterMode){interpreterPaint();return}playbackIcons();highlight();remember()};audio.onseeked=()=>{highlight();normalSegmentArm()};audio.onended=()=>{if(state.interpreterMode){interpreter.advance();return}state.completed||={};state.completed[unit().id]=true;renderSections();$('[data-section-end]').hidden=false;playbackIcons();highlight()};audio.onerror=showError;window.addEventListener('pagehide',pause);render();
})();
