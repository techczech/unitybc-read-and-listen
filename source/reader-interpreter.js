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
 const key=this.unitId+':'+lang;if(!this.urls.has(key))this.urls.set(key,URL.createObjectURL(new Blob([Uint8Array.from(atob(this.unit().tracks[lang]),c=>c.charCodeAt(0))],{type:'audio/mpeg'})));
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
