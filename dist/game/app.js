import {newGame,act,stats,serialize,deserialize,visibleEnemies,findPath,canStep,enemyAt,objectAt,distance,key,W,H,DIRS,passable,dangerCells,canInteract,explorationPath} from './engine.js';
import {ITEMS,ENEMIES,FLOORS,STATUSES,TALENTS} from './catalog.js';
import {DungeonRenderer} from './renderer.js';
import {Sound} from './audio.js';

const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={sword:'M14 3l7-1-1 7-11 11-5-5L14 3M3 14l7 7M5 19l-3 3',shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4M8 12l3 3 5-6',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',coin:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M12 7v10M9 8h4a2 2 0 0 1 0 4h-2a2 2 0 0 0 0 4h4',bag:'M8 7V5a4 4 0 0 1 8 0v2M5 7h14l2 14H3L5 7M8 11v3M16 11v3',compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M16 8l-3 5-5 3 3-5 5-3',wait:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2',sound:'M11 4L6 8H2v8h4l5 4V4M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14',mute:'M11 4L6 8H2v8h4l5 4V4M16 9l6 6M22 9l-6 6',move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${shapes[n]||shapes.spark}"/></svg>`;
const sprite=n=>`<span class="sprite s${n}" aria-hidden="true"></span>`;
const roman=['I','II','III','IV'];
const SAVE='lanternfall.run.v1';let state=null,saved=null,renderer=null,autoTimer=null,autoMode=null,modalKind=null,toastTimer=null,floorTimer=null,lastSaved=true,activePackTab='all';const sound=new Sound();
try{saved=deserialize(localStorage.getItem(SAVE));}catch{}
if(saved?.phase==='playing'){$('continue').hidden=false;$('new-game').className='button secondary';$('new-game').innerHTML='Begin a new journey <span>↗</span>';}
for(const [id,n]of [['bag-icon','bag'],['explore-icon','compass'],['wait-icon','wait'],['sound','mute']])$(id).innerHTML=icon(n);
function save(){try{localStorage.setItem(SAVE,serialize(state));lastSaved=true;}catch{lastSaved=false;}$('save-status').textContent=lastSaved?'Saved on this device':'Saving unavailable';}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
function stopAuto(){clearTimeout(autoTimer);autoTimer=null;autoMode=null;if(renderer)renderer.path=[];$('explore').innerHTML=icon('compass')+'<span>Explore</span>';}
function openModal(kind,title,kicker,html,locked=false){stopAuto();modalKind=kind;$('modal-title').textContent=title;$('modal-kicker').textContent=kicker;$('modal-content').innerHTML=html;$('close-modal').hidden=locked;if(!$('modal').open)$('modal').showModal();}
function closeModal(){if(modalKind==='talent')return;$('modal').close();modalKind=null;}
$('close-modal').onclick=closeModal;
$('modal').addEventListener('cancel',e=>{if(modalKind==='talent'){e.preventDefault();return;}modalKind=null;});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')&&modalKind!=='talent'){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function seed(){const raw=new URLSearchParams(location.search).get('seed'),requested=Number(raw);return raw!==null&&Number.isInteger(requested)&&requested>=0&&requested<=0xffffffff?requested>>>0:crypto.getRandomValues(new Uint32Array(1))[0];}
function start(s){closeModal();state=s;saved=s;stopAuto();$('title-screen').hidden=true;$('game-screen').hidden=false;renderer??=new DungeonRenderer($('dungeon'),onTile);renderer.resize();renderer.fx=[];renderer.setState(state,true);save();update();showFloor();if(state.pendingTalents)showTalents();}
function requestNew(){if(saved?.phase==='playing'&&!state){openModal('confirm','A new beginning','LEAVE THIS RUN?',`<p class="pause-note">Your current journey will end. Your next dungeon will be different.</p><button id="confirm-new" class="button gold">Begin a new journey</button><button id="keep-run" class="button secondary">Keep my current run</button>`);$('confirm-new').onclick=()=>start(newGame(seed()));$('keep-run').onclick=closeModal;}else start(newGame(seed()));}
$('new-game').onclick=requestNew;$('continue').onclick=()=>start(saved);
function perform(action,{auto=false}={}){
  if(!state||$('modal').open)return false;if(!auto)stopAuto();const oldHp=state.hero.hp,oldLevel=state.hero.level,oldPhase=state.phase,oldLog=state.log.at(-1);
  const result=act(state,action);
  if(result.spent){if(state.phase==='dead')sound.play('dead');else if(state.phase==='won')sound.play('won');else if(state.hero.level>oldLevel)sound.play('level');else if(state.hero.hp<oldHp)sound.play('hurt');else if(state.events.some(e=>e.type==='hit'))sound.play('hit');else sound.play(action.type==='move'?'step':action.type==='wait'?'wait':'item');save();}
  else if(state.log.at(-1)!==oldLog)toast(state.log.at(-1).text);
  renderer.setState(state,result.changedFloor);update();
  if(result.changedFloor){stopAuto();showFloor();}
  if(state.phase!=='playing'){stopAuto();if(oldPhase==='playing')setTimeout(showResult,300);}
  else if(state.pendingTalents){stopAuto();setTimeout(showTalents,180);}
  return result.spent;
}
function onTile(x,y){
  if(!state||$('modal').open||state.phase!=='playing')return;stopAuto();
  if(x<0||y<0||x>=W||y>=H||!state.explored[key(x,y)]){toast('Your lantern has not reached there yet.');return;}
  const e=enemyAt(state,x,y),o=objectAt(state,x,y),p={x,y};
  if(distance(state.hero,p)===0){if(o&&['stairs','shrine','beacon'].includes(o.type))perform({type:'interact',id:o.id});else perform({type:'wait'});return;}
  if(o&&['stairs','shrine','beacon'].includes(o.type)&&canInteract(state,o)){perform({type:'interact',id:o.id});return;}
  if(e&&!state.visible[key(x,y)])return;
  const path=findPath(state,state.hero,p);if(!path.length){toast('There is no clear route there.');return;}
  renderer.path=path;if(visibleEnemies(state).length||path.length===1){perform({type:'move',dx:path[0].x-state.hero.x,dy:path[0].y-state.hero.y});return;}
  walkPath(path);
}
function walkPath(path){autoMode='path';const step=()=>{if($('modal').open||!state||state.phase!=='playing'||state.pendingTalents){stopAuto();return;}if(visibleEnemies(state).length||state.hero.statuses.poison||state.hero.statuses.burn){stopAuto();return;}const p=path.shift();if(!p){stopAuto();return;}const o=objectAt(state,p.x,p.y);if(o?.type==='trap'&&!o.hidden){stopAuto();toast('A revealed trap blocks the route. Choose your next step.');return;}renderer.path=[p,...path];if(!perform({type:'move',dx:p.x-state.hero.x,dy:p.y-state.hero.y},{auto:true})){stopAuto();return;}if(autoMode)autoTimer=setTimeout(step,150);};step();}
function explore(){
  if(!state||state.phase!=='playing'||$('modal').open)return;
  if(autoMode){stopAuto();return;}if(visibleEnemies(state).length){toast('Deal with nearby enemies before exploring.');return;}if(state.hero.hp<state.hero.maxHp*.25||state.hero.statuses.poison||state.hero.statuses.burn){toast('Tend to your wounds before exploring.');return;}
  autoMode='explore';$('explore').innerHTML=icon('wait')+'<span>Stop</span>';
  const step=()=>{if(!autoMode||$('modal').open||state.phase!=='playing'||state.pendingTalents||visibleEnemies(state).length){stopAuto();return;}
    if(state.hero.hp<state.hero.maxHp*.25||state.hero.statuses.poison||state.hero.statuses.burn){stopAuto();toast('Danger interrupts your exploration.');return;}
    const path=explorationPath(state);
    if(!path.length){stopAuto();toast('Every reachable passage is explored. Look for the stairs.');return;}
    renderer.path=path;const p=path[0];if(!perform({type:'move',dx:p.x-state.hero.x,dy:p.y-state.hero.y},{auto:true})){stopAuto();return;}
    if(autoMode)autoTimer=setTimeout(step,165);
  };step();
}
function update(){
  if(!state)return;const h=state.hero,st=stats(state),f=FLOORS[state.floor];
  $('health-text').textContent=`${h.hp} / ${h.maxHp}`;$('health-fill').style.width=`${h.hp/h.maxHp*100}%`;$('xp-fill').style.width=`${h.xp/h.nextXp*100}%`;$('level-text').textContent=`LEVEL ${h.level}`;$('xp-text').textContent=`${h.xp} / ${h.nextXp} XP`;
  $('attack-stat').innerHTML=icon('sword')+st.attack;$('attack-stat').title=`Attack ${st.attack}`;$('defence-stat').innerHTML=icon('shield')+st.defence;$('defence-stat').title=`Defence ${st.defence}`;$('gold-stat').innerHTML=icon('coin')+state.gold;
  $('header-floor').textContent=`FLOOR ${roman[state.floor]} / IV`;$('floor-number').textContent=['THE FIRST DESCENT','BENEATH THE MOON','WHERE GLASSROOT GROWS','THE LAST LIGHT'][state.floor];$('floor-name').textContent=f.name;$('floor-lore').textContent=f.subtitle;
  $('floor-progress').innerHTML=roman.map((r,i)=>`<span class="floor-step ${i===state.floor?'current':i<state.floor?'done':''}">${i<state.floor?'✓':r}</span>`).join('');
  $('statuses').innerHTML=Object.entries(h.statuses).filter(([,n])=>n>0).map(([id,n])=>`<span class="status-pill" style="color:${STATUSES[id]?.color||'#ddd'}" title="${escape(STATUSES[id]?.desc||id)}">${STATUSES[id]?.label||id} ${n}</span>`).join('');
  $('side-equipment').innerHTML=[h.weapon,h.armour].map(id=>`<div class="equipment-row">${sprite(ITEMS[id].sprite)}<div><strong>${ITEMS[id].name}</strong><small>+${ITEMS[id].power} ${ITEMS[id].type==='weapon'?'attack':'defence'}</small></div></div>`).join('');
  const enemies=visibleEnemies(state);$('enemy-strip').hidden=!enemies.length;$('enemy-strip').innerHTML=enemies.slice(0,4).map(e=>`<button class="enemy-chip" data-enemy="${e.id}">${sprite(ENEMIES[e.type].sprite)}<span>${ENEMIES[e.type].name}</span><b>${e.intent?'WINDING UP':e.recovery?'RECOVERING':e.hp+' HP'}</b></button>`).join('');
  $('enemy-strip').querySelectorAll('button').forEach(b=>b.onclick=()=>inspectEnemy(state.enemies.find(e=>e.id===Number(b.dataset.enemy))));
  const boss=enemies.find(e=>e.type==='boss');$('boss-bar').hidden=!boss;if(boss)$('boss-bar').innerHTML=`<b>THE LANTERN WARDEN</b><div class="boss-track"><div style="width:${boss.hp/boss.maxHp*100}%"></div></div>`;
  const context=state.objects.filter(o=>!o.used&&['stairs','shrine','beacon','chest'].includes(o.type)&&canInteract(state,o)&&!enemyAt(state,o.x,o.y)&&state.visible[key(o.x,o.y)]).sort((a,b)=>distance(h,a)-distance(h,b))[0];
  $('context-action').hidden=!context||state.phase!=='playing';if(context){$('context-action').textContent=({stairs:'Descend to floor '+(state.floor+2)+' ↓',shrine:'Drink from the moonwell',chest:'Open chest',beacon:state.bossDefeated?'Return the dawn ✦':'The beacon is sealed'})[context.type];$('context-action').onclick=()=>perform({type:'interact',id:context.id});}
  $('board-hint').hidden=!!context||state.turn>10||enemies.length>0;
  $('recent-log').innerHTML=state.log.slice(-2).map(l=>`<p class="${l.tone}">${escape(l.text)}</p>`).join('');$('side-log').innerHTML=state.log.slice(-5).reverse().map(l=>`<p class="${l.tone}">${escape(l.text)}</p>`).join('');
  const healCount=state.inventory.find(i=>i.id==='healing')?.qty||0;$('heal-count').textContent=healCount;$('quick-heal').disabled=!healCount||state.phase!=='playing';$('scroll-count').textContent=state.inventory.filter(i=>ITEMS[i.id].type==='scroll').reduce((n,i)=>n+i.qty,0);
  $('turn-text').textContent=`TURN ${state.turn}`;$('wait').disabled=state.phase!=='playing';$('explore').disabled=state.phase!=='playing';drawMap($('mini-map'));
  $('tactical-tip').textContent=h.statuses.poison?'Poison hurts each turn. Clearwater cures it; a moonwell also cleanses every ailment.':enemies.some(e=>e.intent)?'A heavy attack is coming. Leave the red tiles this turn, or freeze the attacker.':'Red tiles show where an attack will land next turn. A step aside can save your life.';
}
function showFloor(){const f=FLOORS[state.floor];$('floor-toast').innerHTML=`<span class="eyebrow">FLOOR ${roman[state.floor]} OF IV</span><h3>${f.name}</h3><p>${f.subtitle}</p>`;$('floor-toast').hidden=false;clearTimeout(floorTimer);floorTimer=setTimeout(()=>$('floor-toast').hidden=true,2600);}
function showGuide(){openModal('guide','A little light. A few rules.','THE WAYFARER’S HANDBOOK',[
  ['move','Take your time','Tap explored ground to walk. Tap an adjacent enemy to attack. Every move, attack, item or equipment change takes one turn. Diagonal steps cannot cut through walls. Nothing moves while you think.'],
  ['wait','Let danger come to you','Wait advances one turn. Red tiles show a prepared attack: step out before it lands, then strike during its recovery. Tap an enemy’s name for its field notes.'],
  ['bag','Make good use of your pack','Tonics heal, scrolls turn a fight, and better equipment is worth a detour. The moonwell heals and cleanses once per floor, when enemies are gone.'],
  ['spark','Carry the dawn home','Find the stairs on each floor. Defeat the Warden on floor four, then light the beacon. Death ends the run; a new journey has a new dungeon.'],
].map(([i,t,p])=>`<div class="guide-row"><span>${icon(i)}</span><div><b>${t}</b><p>${p}</p></div></div>`).join('')+`<div class="guide-note"><p><b>On a keyboard</b><br>WASD / arrows: move · Space: wait · E: explore<br>B: pack · M: map · 1: heal · Esc: pause</p></div><p>Your run saves after every turn on this device. Keep the same browser to resume. On browsers that support installation, add Lanternfall to your home screen. Offline play becomes available after the game has finished downloading.</p>`);}
$('title-guide').onclick=showGuide;$('help').onclick=showGuide;
async function toggleSound(){const enabled=await sound.toggle();$('sound').innerHTML=icon(enabled?'sound':'mute');$('sound').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');$('title-audio').textContent=enabled?'Sound on':'Sound off';if($('pause-sound'))$('pause-sound').textContent=enabled?'On':'Off';}
$('sound').onclick=toggleSound;$('title-audio').onclick=toggleSound;
function showPack(tab='all'){
  activePackTab=tab;const h=state.hero;
  openModal('pack','Your pack','TRAVEL LIGHT. CHOOSE WELL.',`<div class="pack-top">${[h.weapon,h.armour].map(id=>`<div>${sprite(ITEMS[id].sprite)}<span><strong>${ITEMS[id].name}</strong><small>Equipped · +${ITEMS[id].power} ${ITEMS[id].type==='weapon'?'ATK':'DEF'}</small></span></div>`).join('')}</div><div class="tabs" role="tablist" aria-label="Item type">${[['all','Everything'],['potion','Potions'],['scroll','Scrolls'],['gear','Equipment']].map(([id,name])=>`<button role="tab" aria-selected="${id===tab}" class="${id===tab?'active':''}" data-tab="${id}">${name}</button>`).join('')}</div><div class="item-list" id="item-list"></div><p style="font-size:.875rem;margin-top:15px">Using an item or changing equipment takes one turn.</p>`);
  const items=state.inventory.filter(i=>tab==='all'||(tab==='gear'?['weapon','armour'].includes(ITEMS[i.id].type):ITEMS[i.id].type===tab));
  $('item-list').innerHTML=items.length?items.map(i=>{const d=ITEMS[i.id];return `<div class="item-card">${sprite(d.sprite)}<div class="item-info"><b>${d.name}</b><small>×${i.qty}</small><p>${d.desc}</p></div><button data-use="${i.id}">${['weapon','armour'].includes(d.type)?'Equip':d.type==='scroll'?'Read':d.type==='food'?'Eat':'Drink'}</button></div>`;}).join(''):'<p class="item-empty">Nothing in this pocket yet.</p>';
  $('modal-content').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showPack(b.dataset.tab));
  $('modal-content').querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const id=b.dataset.use;closeModal();perform({type:'item',id});});
}
$('inventory').onclick=()=>showPack();$('quick-scroll').onclick=()=>showPack('scroll');$('quick-heal').onclick=()=>perform({type:'item',id:'healing'});$('wait').onclick=()=>perform({type:'wait'});$('explore').onclick=explore;
function drawMap(canvas,large=false){const c=canvas.getContext('2d'),scale=large?12:3;canvas.width=W*scale;canvas.height=H*scale;c.fillStyle='#0c1520';c.fillRect(0,0,canvas.width,canvas.height);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(state.explored[key(x,y)]){c.fillStyle=state.map[key(x,y)]?(state.visible[key(x,y)]?'#52716f':'#2b404b'):'#182c39';c.fillRect(x*scale,y*scale,scale-.3,scale-.3);}for(const o of state.objects)if(!o.used&&!o.hidden&&state.explored[key(o.x,o.y)]&&['stairs','beacon','shrine','chest'].includes(o.type)){c.fillStyle=o.type==='stairs'||o.type==='beacon'?'#efd293':o.type==='shrine'?'#95c4e1':'#be956a';c.fillRect(o.x*scale,o.y*scale,scale,scale);}for(const e of visibleEnemies(state)){c.fillStyle='#dc9292';c.fillRect(e.x*scale,e.y*scale,scale,scale);}c.fillStyle='#f2e4b9';c.fillRect(state.hero.x*scale-.5,state.hero.y*scale-.5,scale+1,scale+1);}
function showMap(){openModal('map',FLOORS[state.floor].name,`FLOOR ${roman[state.floor]} / IV`,`<canvas id="large-map" class="map-large" aria-label="Map of explored dungeon. Tap a revealed corridor to travel."></canvas><div class="map-key"><span style="--swatch:#f2e4b9">You</span><span style="--swatch:#efd293">Stairs / beacon</span><span style="--swatch:#95c4e1">Moonwell</span><span style="--swatch:#dc9292">Enemy</span></div><p style="font-size:.875rem">Tap an explored tile to travel. Movement stops when danger appears.</p>`);drawMap($('large-map'),true);$('large-map').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*W),y=Math.floor((e.clientY-r.top)/r.height*H);closeModal();onTile(x,y);};}
$('map-button').onclick=showMap;
function showJournal(){openModal('journal','Field notes','YOUR JOURNEY SO FAR',`<div class="tabs"><button id="journal-tab" class="active">Journal</button><button id="bestiary-tab">Bestiary</button></div><div class="journal-full">${state.log.slice().reverse().map(l=>`<p><small>TURN ${l.turn}</small>${escape(l.text)}</p>`).join('')}</div>`);$('bestiary-tab').onclick=showBestiary;}
function showBestiary(){openModal('bestiary','Things in the dark',`${state.discovered.length} / ${Object.keys(ENEMIES).length} ENCOUNTERED`,`<div class="bestiary-list item-list">${Object.entries(ENEMIES).map(([id,d])=>state.discovered.includes(id)?`<div class="item-card">${sprite(d.sprite)}<div class="item-info"><b>${d.name}</b><p>${d.desc}</p></div></div>`:`<div class="item-card"><div class="sprite" style="background:none;text-align:center;padding:17px;color:#6c8794">?</div><div class="item-info"><b>Not yet encountered</b><p>Some secrets are waiting below.</p></div></div>`).join('')}</div>`);}
function inspectEnemy(e){if(!e)return;const d=ENEMIES[e.type];openModal('enemy',d.name,'FIELD NOTES',`<div class="item-card">${sprite(d.sprite)}<div class="item-info"><b>${e.hp} / ${e.maxHp} health</b><p>Attack ${e.attack} · Defence ${e.defence} · ${e.xp} XP</p></div></div><p style="margin-top:20px">${d.desc}</p>${e.intent?'<div class="guide-note"><p>An attack is prepared. Red tiles will be struck after your next action.</p></div>':''}`);}
$('journal-button').onclick=showJournal;$('bestiary-button').onclick=showBestiary;
function showTalents(){if(!state.pendingTalents||state.phase!=='playing')return;openModal('talent','A brighter flame',`LEVEL ${state.hero.level} · CHOOSE A BLESSING`,TALENTS.map(t=>`<button class="talent-card" data-talent="${t.id}"><span>${icon(t.icon)}</span><div><strong>${t.name}</strong><p>${t.desc}</p></div></button>`).join(''),true);$('modal-content').querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>{act(state,{type:'talent',id:b.dataset.talent});save();renderer.setState(state);update();modalKind=null;$('modal').close();if(state.pendingTalents)showTalents();});}
function showPause(){openModal('pause','A moment by the light','JOURNEY PAUSED',`<p class="pause-note">Your journey is ${lastSaved?'saved on this device':'not being saved: browser storage is unavailable'}. Take your time.</p><button id="resume" class="button gold">Return to the ruins <span>↗</span></button><button id="pause-guide" class="button secondary">How to play</button><div class="settings-row"><span>Sound effects</span><button id="pause-sound">${sound.enabled?'On':'Off'}</button></div><button id="abandon" class="button danger">End this journey</button><p class="result-seed">Dungeon seed: ${state.seed}</p>`);$('resume').onclick=closeModal;$('pause-guide').onclick=showGuide;$('pause-sound').onclick=toggleSound;$('abandon').onclick=()=>{openModal('confirm','Leave the ruins?','END THIS JOURNEY',`<p class="pause-note">This ends the current run. A fresh dungeon will be waiting when you return.</p><button id="abandon-confirm" class="button danger">End this journey</button><button id="abandon-cancel" class="button secondary">Keep exploring</button>`);$('abandon-cancel').onclick=closeModal;$('abandon-confirm').onclick=()=>{state.phase='dead';state.cause='a journey left unfinished';save();showResult();};};}
$('pause').onclick=showPause;
function showResult(){if(state.phase==='playing')return;const won=state.phase==='won';openModal('result',won?'And dawn returns.':'Even little lights go out.',won?'JOURNEY COMPLETE':'JOURNEY ENDED',`<div class="run-result">${sprite(won?15:0)}<p>${won?'The Warden rests. The old kingdom wakes to a sky it thought it had lost. You carried the dawn home.':`You reached ${FLOORS[state.floor].name}. Your journey ended with ${escape(state.cause||'the dark')}. Another lantern is waiting.`}</p><div class="result-stats"><div><b>${state.floor+1} / 4</b><small>FLOORS</small></div><div><b>${state.kills}</b><small>DEFEATED</small></div><div><b>${state.hero.level}</b><small>LEVEL</small></div></div><p class="result-seed">${state.turn} turns · ${state.gold} gold · Seed ${state.seed}</p><button id="play-again" class="button gold">A new journey <span>↗</span></button><button id="same-seed" class="button secondary">Try this dungeon again</button></div>`);$('play-again').onclick=()=>start(newGame(crypto.getRandomValues(new Uint32Array(1))[0]));$('same-seed').onclick=()=>start(newGame(state.seed));}
document.addEventListener('keydown',e=>{
  if(!state||$('game-screen').hidden||e.altKey||e.ctrlKey||e.metaKey)return;if($('modal').open)return;
  if((e.code==='Space'||e.key==='Enter')&&e.target.closest?.('button,input,select,textarea,a'))return;
  const moves={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],q:[-1,-1],z:[-1,1],c:[1,1],r:[1,-1]};
  if(moves[e.key]){e.preventDefault();if(!e.repeat)perform({type:'move',dx:moves[e.key][0],dy:moves[e.key][1]});}
  else if(e.code==='Space'||e.key==='.'){e.preventDefault();if(!e.repeat)perform({type:'wait'});}
  else if(e.key.toLowerCase()==='b')showPack();else if(e.key.toLowerCase()==='m')showMap();else if(e.key.toLowerCase()==='e')explore();else if(e.key==='1')perform({type:'item',id:'healing'});else if(e.key==='Escape')showPause();else if(e.key==='?')showGuide();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();if(state)save();}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
