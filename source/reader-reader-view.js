/* Visual views do not change playback. Only an actual audio-mode change stops it. */
 function currentReadingPair(){const u=unit(),lang=state.language,key=u.id+':'+lang,time=activeKey===key?audio.currentTime:state.positions[key]||0;let index=(u.interpreterPairs||[]).findIndex(p=>time>=p[lang].start&&time<p[lang].end);if(index<0)index=Math.max(0,(u.interpreterPairs||[]).findLastIndex(p=>time>=p[lang].start));return index}
 function normalSeek(time,autoplay=false){clearNormalSegmentPause();const key=unit().id+':'+state.language;if(activeKey===key){audio.currentTime=time;remember();if(autoplay)audio.play().catch(showError);highlight()}else{state.positions[key]=time;save();if(autoplay)listen();else highlight()}}
 function readingHighlights(){const u=unit(),lang=state.language,key=u.id+':'+lang,loaded=activeKey===key,time=loaded?audio.currentTime:state.positions[key],enabled=loaded||Number.isFinite(time);controls.highlight($('[data-content]'),time||0,enabled);const ref=$('[data-reference]');controls.highlight(ref,0,false);const paired=u.interpreterPairs?.[currentReadingPair()],other=lang==='en'?data.defaults.language:'en';for(const span of ref.querySelectorAll('[data-sentence-start]'))span.classList.toggle('translation-partner',Boolean(enabled&&paired&&Number(span.dataset.sentenceStart)>=paired[other].start-.001&&Number(span.dataset.sentenceEnd)<=paired[other].end+.001));if(state.focusView)focusPaint();normalToolsPaint();requestReadingFollow()}
 function focusPaint(){if(state.interpreterMode||!state.focusView)return;const u=unit(),pair=currentReadingPair(),lang=state.language,key=u.id+':'+lang,time=activeKey===key?audio.currentTime:state.positions[key],active=activeKey===key||Number.isFinite(time),segment=u.interpreterPairs[pair];$('[data-pair-progress]').textContent=copy().pairProgress.replace('{number}',pair+1).replace('{total}',u.interpreterPairs.length);$('[data-pair-select]').value=pair;$('[data-now-reading]').textContent=active?(audio.paused?copy().pausedReading:copy().nowReading)+' '+data.languageLabels[lang]:data.languageLabels[lang];for(const card of document.querySelectorAll('[data-pair-card]')){const current=Number(card.dataset.pairCard)===pair;card.hidden=!current;card.classList.toggle('pair-current',current);for(const text of card.querySelectorAll('[data-pair-text]')){const show=state.parallel||text.dataset.language===lang;text.hidden=!show;text.previousElementSibling.hidden=!show;const speaking=current&&text.dataset.language===lang&&active;text.classList.toggle('pair-speaking',speaking);controls.highlight(text,time||0,speaking);for(const span of text.querySelectorAll('[data-sentence-start]'))span.classList.toggle('translation-partner',current&&active&&text.dataset.language!==lang)}}sentenceButtons();}
 function focusSkip(direction){const i=Math.max(0,Math.min(unit().interpreterPairs.length-1,currentReadingPair()+direction));normalSeek(unit().interpreterPairs[i][state.language].start)}
 function readerChrome(){normalToolsPaint();segmentModePaint();readerChoices();requestReadingFollow();$('[data-reader-section-actions]').hidden=false;$('[data-prev]').hidden=data.units.length===1;$('[data-next]').hidden=data.units.length===1;$('[data-prev]').setAttribute('aria-label',copy().previous);$('[data-next]').setAttribute('aria-label',copy().next);document.body.classList.toggle('focus-view',Boolean(state.focusView));document.body.classList.toggle('sidebar-collapsed',Boolean(state.sidebarCollapsed));$('[data-focus-view]').setAttribute('aria-pressed',String(Boolean(state.focusView)));$('[data-sidebar-toggle]').setAttribute('aria-expanded',String(!state.sidebarCollapsed));$('[data-sidebar-toggle]').title=copy()[state.sidebarCollapsed?'showSidebar':'hideSidebar'];$('[data-sidebar-toggle]').textContent=state.sidebarCollapsed?'‹':copy().hideSidebar;$('[data-sidebar-toggle]').setAttribute('aria-label',copy()[state.sidebarCollapsed?'showSidebar':'hideSidebar']);$('[data-sidebar-body]').hidden=Boolean(state.sidebarCollapsed);$('[data-rail-title]').textContent=copy().sections;const rail=$('[data-rail-sections]');rail.replaceChildren();data.units.forEach((u,i)=>{const button=document.createElement('button');button.type='button';button.textContent=(i+1)+'. '+title(u);button.setAttribute('aria-current',i===state.index?'page':'false');button.onclick=()=>navigate(i);rail.append(button)});$('.section-rail').hidden=data.units.length===1;document.body.classList.toggle('single-section',data.units.length===1);readerActionIcons();}
 $('[data-focus-view]').onclick=()=>{state.focusView=!state.focusView;render()};$('[data-sidebar-toggle]').onclick=()=>{state.sidebarCollapsed=!state.sidebarCollapsed;readerChrome();save()};

 $('[data-round-transport]').append($('[data-question-sentence-controls]'));$('[data-round-speed]').append($('.speed-line'));$('[data-reader-section-actions]').append($('[data-prev]'),$('[data-next]'));

 // Keep the current line in the unobscured reading area, rather than remembering
 // only a passage number across DOM replacement and changes in column height.
 let readingFollowFrame=null;
 function requestReadingFollow(){
  if(readingFollowFrame!==null)return;
  readingFollowFrame=requestAnimationFrame(()=>{
   readingFollowFrame=null;if(state.followInterpreter===false||selectingText||!window.getSelection().isCollapsed||document.activeElement?.matches('textarea,input,select'))return;
   const candidates=[...document.querySelectorAll('.sentence-reading')],line=candidates.find(el=>el.getClientRects().length);
   const fallback=state.interpreterMode?document.querySelector('[data-pair-card="'+interpreter.position().pair+'"]'):null;
   const target=line||fallback;if(!target||!target.getClientRects().length)return;
   const rect=line?line.getBoundingClientRect():target.getBoundingClientRect(),toolbar=$('.content-toolbar').getBoundingClientRect(),footer=$('.reader-playback').getBoundingClientRect();
   if(document.body.classList.contains('embed')){window.UnityBCFollowTarget?.(rect);return;}
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

 function normalToolsPaint(){
  if(state.interpreterMode||state.focusView)return;
  const u=unit(),select=$('[data-pair-select]');$('[data-interpreter-tools]').hidden=false;
  if(select.dataset.optionsUnit!==u.id){select.replaceChildren(...u.interpreterPairs.map((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+' / '+u.interpreterPairs.length;return o}));select.dataset.optionsUnit=u.id;}
  select.value=currentReadingPair();select.setAttribute('aria-label',copy().passage);
  $('[data-follow-reading]').checked=state.followInterpreter!==false;
  $('[data-now-reading]').textContent=(audio.paused?copy().pausedReading:copy().nowReading)+' '+data.languageLabels[state.language];
  controls.icon($('[data-repeat-pair]'),'RotateCcw',copy().repeatPair,data.icons);
 }
 function readerActionIcons(){
  for(const [selector,name,label] of [['[data-focus-view]','Focus',copy().focusView],['[data-prev]','ChevronLeft',copy().previousShort],['[data-next]','ChevronRight',copy().nextShort],['[data-end-next]','ChevronRight',copy().next],['[data-export]','Download',copy().export],['[data-selection-close]','X',copy().closeSelection]]){
   const button=$(selector);controls.icon(button,name,label,data.icons);button.classList.remove('icon-button');const text=document.createElement('span');text.textContent=label;button.append(text);
  }
  const toggle=$('[data-sidebar-toggle]'),label=copy()[state.sidebarCollapsed?'showSidebar':'hideSidebar'];controls.icon(toggle,state.sidebarCollapsed?'Bookmark':'X',label,data.icons);
  if(!state.sidebarCollapsed){const text=document.createElement('span');text.textContent=label;toggle.append(text);toggle.classList.remove('icon-button');}
 }
