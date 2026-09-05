import {ITEMS, ENEMIES, STATUSES} from './catalog.js';

export const VERSION=1, W=31, H=31;
export const DIRS=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
export const key=(x,y)=>y*W+x;
export const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;
export function rand(s){ let t=s.rng+=0x6D2B79F5;s.rng>>>=0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; }
const pick=(s,a)=>a[Math.floor(rand(s)*a.length)];
const integer=(s,a,b)=>a+Math.floor(rand(s)*(b-a+1));
export function addLog(s,text,tone='normal'){s.log.push({text,tone,turn:s.turn});if(s.log.length>60)s.log.shift();}
export function newGame(seed=Date.now()){
  const s={version:VERSION,seed:seed>>>0,rng:seed>>>0,turn:0,floor:0,phase:'playing',uid:1,log:[],events:[],kills:0,gold:0,hits:0,pendingTalents:0,
    hero:{x:5,y:5,hp:38,maxHp:38,level:1,xp:0,nextXp:14,baseAttack:4,baseDefence:0,weapon:'rustySword',armour:'cloak',statuses:{},talents:[]},
    inventory:[{id:'healing',qty:3},{id:'antidote',qty:1},{id:'frost',qty:1},{id:'ration',qty:1}],discovered:[],explored:[],visible:[],enemies:[],objects:[],map:[],rooms:[],hazards:[]};
  generateFloor(s);addLog(s,'Your lantern stirs. Something below is calling.','story');return s;
}
export function tile(s,x,y){return inside(x,y)?s.map[key(x,y)]:0;}
export function passable(s,x,y){return tile(s,x,y)>0;}
export function canStep(s,from,to){return passable(s,to.x,to.y)&&distance(from,to)===1&&(!(from.x!==to.x&&from.y!==to.y)||(passable(s,from.x,to.y)&&passable(s,to.x,from.y)));}
export function canInteract(s,o){return !!o&&!o.used&&(distance(s.hero,o)===0||canStep(s,s.hero,o));}
export function enemyAt(s,x,y){return s.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);}
export function objectAt(s,x,y){return s.objects.find(o=>o.x===x&&o.y===y&&!o.used);}
export function stats(s){const h=s.hero;return {attack:h.baseAttack+ITEMS[h.weapon].power+(h.statuses.might?3:0),defence:h.baseDefence+ITEMS[h.armour].power};}
export function spawnEnemy(s,type,x,y){const d=ENEMIES[type],scale=type==='boss'?0:s.floor;const e={id:s.uid++,type,x,y,hp:d.hp+scale*3,maxHp:d.hp+scale*3,attack:d.attack+Math.floor(scale/2),defence:d.defence,xp:d.xp+scale,statuses:{},intent:null,alert:false,turns:0,summoned:false};s.enemies.push(e);return e;}
export function generateFloor(s){
  s.map=Array(W*H).fill(0);s.explored=Array(W*H).fill(false);s.visible=Array(W*H).fill(false);s.enemies=[];s.objects=[];s.hazards=[];s.rooms=[];
  const carve=(x,y)=>{if(inside(x,y))s.map[key(x,y)]=1;};
  for(let gy=0;gy<3;gy++)for(let gx=0;gx<3;gx++){
    const x=gx*10+2+integer(s,0,1),y=gy*10+2+integer(s,0,1),w=integer(s,5,7),h=integer(s,5,7);
    const room={x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};s.rooms.push(room);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)carve(xx,yy);
  }
  const connect=(a,b)=>{let x=a.cx,y=a.cy;while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x);}while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y);}carve(x,y);};
  // A randomized spanning tree makes every room reachable; extra edges make loops.
  const reached=new Set([0]);while(reached.size<9){const links=[];for(const a of reached)for(const b of [a%3<2?a+1:-1,a%3>0?a-1:-1,a+3,a-3])if(b>=0&&b<9&&!reached.has(b))links.push([a,b]);const [a,b]=pick(s,links);connect(s.rooms[a],s.rooms[b]);reached.add(b);}
  for(let a=0;a<9;a++)for(const b of [a%3<2?a+1:-1,a+3])if(b>=0&&b<9&&rand(s)<.28)connect(s.rooms[a],s.rooms[b]);
  const start=s.rooms[0];s.hero.x=start.cx;s.hero.y=start.cy;
  const used=new Set([key(start.cx,start.cy)]);
  const spot=(room,interior=false)=>{const cells=[],margin=interior?1:0;for(let y=room.y+margin;y<room.y+room.h-margin;y++)for(let x=room.x+margin;x<room.x+room.w-margin;x++)if(!used.has(key(x,y)))cells.push({x,y});const p=pick(s,cells);used.add(key(p.x,p.y));return p;};
  const object=(type,room,extra={})=>s.objects.push({id:s.uid++,type,...spot(room,type==='trap'),used:false,...extra});
  const last=s.rooms[8];const exit=spot(last);s.objects.push({id:s.uid++,type:s.floor===3?'beacon':'stairs',...exit,used:false});
  object('shrine',s.rooms[4]);object('item',start,{item:'healing'});
  const weapons=['moonblade','emberBlade','crownBlade','crownBlade'];
  const armours=['mail','moonArmour','crownArmour','crownArmour'];
  object('chest',s.rooms[2],{loot:[{id:weapons[s.floor],qty:1},{id:'healing',qty:1}],mimic:false});
  object('chest',s.rooms[6],{loot:[{id:armours[s.floor],qty:1},{id:pick(s,['frost','fire','might']),qty:1}],mimic:s.floor===1||s.floor===2});
  const pools=[['slime','slime','bat'],['slime','shroom','skeleton'],['shroom','wisp','skeleton'],['skeleton','wisp']];
  for(let i=1;i<9;i++){
    const room=s.rooms[i];const count=s.floor===3?(i===8?0:1):(i===1?1:integer(s,1,2));
    for(let n=0;n<count;n++){const p=spot(room);spawnEnemy(s,pick(s,pools[s.floor]),p.x,p.y);}
    if(i%2===1)object('item',room,{item:pick(s,['healing','healing','antidote','fire','frost','might','blink','ration'])});
    if(i%3===0)object('gold',room,{amount:integer(s,8,18)});
    if(i>2&&s.floor>0)object('trap',room,{hidden:true});
  }
  if(s.floor===3){const p=spot(last);spawnEnemy(s,'boss',p.x,p.y);}
  updateVision(s);
}
export function lineOfSight(s,a,b){
  // Choose a stable ray direction so visibility is reciprocal at grid corners.
  if(a.x>b.x||(a.x===b.x&&a.y>b.y))[a,b]=[b,a];
  let x=a.x,y=a.y,dx=Math.abs(b.x-x),sx=x<b.x?1:-1,dy=-Math.abs(b.y-y),sy=y<b.y?1:-1,err=dx+dy;
  while(x!==b.x||y!==b.y){const e=2*err,oldX=x,oldY=y;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}
    if(x!==oldX&&y!==oldY&&(!passable(s,x,oldY)||!passable(s,oldX,y)))return false;
    if(x===b.x&&y===b.y)return true;if(!passable(s,x,y))return false;
  }return true;
}
export function updateVision(s){
  s.visible.fill(false);const h=s.hero;for(let y=Math.max(0,h.y-7);y<=Math.min(H-1,h.y+7);y++)for(let x=Math.max(0,h.x-7);x<=Math.min(W-1,h.x+7);x++){
    if(Math.hypot(x-h.x,y-h.y)<=7.2&&lineOfSight(s,h,{x,y})){s.visible[key(x,y)]=true;s.explored[key(x,y)]=true;}
  }
  for(const e of s.enemies)if(e.hp>0&&s.visible[key(e.x,e.y)]&&!s.discovered.includes(e.type))s.discovered.push(e.type);
  for(const o of s.objects)if(o.type==='trap'&&distance(h,o)<=1&&s.visible[key(o.x,o.y)])o.hidden=false;
}
export function visibleEnemies(s){return s.enemies.filter(e=>e.hp>0&&s.visible[key(e.x,e.y)]);}
export function findPath(s,start,target,{known=true,avoidEnemies=true,avoidTraps=true}={}){
  if(!passable(s,target.x,target.y))return [];
  const queue=[start],prev=new Map([[key(start.x,start.y),null]]);let found=false;
  for(let i=0;i<queue.length;i++){const p=queue[i];if(p.x===target.x&&p.y===target.y){found=true;break;}
    for(const [dx,dy]of DIRS){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);if(prev.has(k)||!canStep(s,p,n)||(known&&!s.explored[k]))continue;
      if(avoidEnemies&&enemyAt(s,n.x,n.y)&&!(n.x===target.x&&n.y===target.y))continue;
      if(!(n.x===target.x&&n.y===target.y)&&s.objects.some(o=>!o.used&&o.x===n.x&&o.y===n.y&&(o.type==='chest'||(avoidTraps&&o.type==='trap'&&!o.hidden))))continue;
      prev.set(k,p);queue.push(n);
    }
  }if(!found)return [];const path=[];let p=target;while(prev.get(key(p.x,p.y))!==null){path.unshift(p);p=prev.get(key(p.x,p.y));}return path;
}
// Search only remembered, traversable ground. Never cross a chest or a revealed trap.
export function explorationPath(s){
  const start={x:s.hero.x,y:s.hero.y},queue=[start],prev=new Map([[key(start.x,start.y),null]]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(i>0&&DIRS.some(([dx,dy])=>canStep(s,p,{x:p.x+dx,y:p.y+dy})&&!s.explored[key(p.x+dx,p.y+dy)])){
      const path=[];let n=p;while(prev.get(key(n.x,n.y))!==null){path.unshift(n);n=prev.get(key(n.x,n.y));}return path;
    }
    for(const[dx,dy]of DIRS){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);
      if(prev.has(k)||!canStep(s,p,n)||!s.explored[k]||enemyAt(s,n.x,n.y)||s.objects.some(o=>!o.used&&o.x===n.x&&o.y===n.y&&(o.type==='chest'||(o.type==='trap'&&!o.hidden))))continue;
      prev.set(k,p);queue.push(n);
    }
  }return [];
}
function event(s,type,x,y,text,color){s.events.push({id:s.uid++,type,x,y,text,color});}
export function addItem(s,id,qty=1){const item=s.inventory.find(i=>i.id===id);if(item)item.qty+=qty;else s.inventory.push({id,qty});}
function removeItem(s,id){const i=s.inventory.find(i=>i.id===id);if(!i||i.qty<1)return false;i.qty--;s.inventory=s.inventory.filter(i=>i.qty>0);return true;}
function heal(s,amount){const h=s.hero,n=Math.min(h.maxHp-h.hp,amount);h.hp+=n;event(s,'heal',h.x,h.y,'+'+n,'#9ce7b4');return n;}
function damageHero(s,n,cause){const h=s.hero,hit=Math.max(1,n-(h.statuses.guard?3:0));h.hp=Math.max(0,h.hp-hit);event(s,'damage',h.x,h.y,'−'+hit,'#ff9e96');if(h.hp===0){s.phase='dead';s.cause=cause;addLog(s,'Your lantern goes dark. The dungeon keeps its secrets.','danger');}return hit;}
function levelUp(s){const h=s.hero;while(h.xp>=h.nextXp){h.xp-=h.nextXp;h.level++;h.nextXp=14+(h.level-1)*11;h.maxHp+=6;h.hp=Math.min(h.maxHp,h.hp+10);h.baseAttack++;s.pendingTalents++;addLog(s,`Level ${h.level}! Your lantern burns brighter.`,'good');event(s,'level',h.x,h.y,'LEVEL UP','#f5d38b');}}
export function hurtEnemy(s,e,damage){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-damage);e.alert=true;event(s,'hit',e.x,e.y,'−'+damage,'#ffe1ac');if(!e.hp){e.intent=null;s.kills++;s.hero.xp+=e.xp;s.gold+=e.type==='boss'?50:integer(s,1,4);addLog(s,`${ENEMIES[e.type].name} defeated. +${e.xp} XP`,'good');if(e.type==='mimic'){for(const i of e.loot||[{id:'healing',qty:2}]){addItem(s,i.id,i.qty);addLog(s,`Recovered ${ITEMS[i.id].name}.`,'loot');}}if(e.type==='boss'){s.bossDefeated=true;addLog(s,'The Warden kneels. Bring your lantern to the beacon.','story');}levelUp(s);}}
function attack(s,e){s.hits++;const amount=Math.max(1,stats(s).attack+integer(s,-1,1)-e.defence);hurtEnemy(s,e,amount);addLog(s,`You strike ${ENEMIES[e.type].name.toLowerCase()} for ${amount}.`);if(e.hp>0&&ITEMS[s.hero.weapon].effect==='burn'&&s.hits%3===0)e.statuses.burn=3;}
function collect(s){const h=s.hero;for(const o of s.objects.filter(o=>!o.used&&o.x===h.x&&o.y===h.y)){
  if(o.type==='item'){addItem(s,o.item);o.used=true;event(s,'loot',o.x,o.y,ITEMS[o.item].name,'#eac584');addLog(s,`Found ${ITEMS[o.item].name}.`,'loot');}
  if(o.type==='gold'){s.gold+=o.amount;o.used=true;addLog(s,`Found ${o.amount} gold.`,'loot');}
  if(o.type==='trap'){o.used=true;damageHero(s,4,'a thorn trap');if(s.phase==='playing')h.statuses.poison=3;addLog(s,'Thorns! Poison seeps into the wound.','danger');}
}}
function interact(s,o){
  if(!canInteract(s,o)||enemyAt(s,o.x,o.y))return false;
  if(o.type==='chest'){
    o.used=true;
    if(o.mimic){const e=spawnEnemy(s,'mimic',o.x,o.y);e.loot=o.loot;e.alert=true;e.statuses.stun=1;addLog(s,'The chest blinks. Then it grins. MIMIC!','danger');event(s,'danger',o.x,o.y,'MIMIC!','#ffba85');}
    else{for(const i of o.loot){addItem(s,i.id,i.qty);addLog(s,`Found ${ITEMS[i.id].name}.`,'loot');}s.gold+=10;event(s,'loot',o.x,o.y,'TREASURE','#eac584');}return true;
  }
  if(o.type==='shrine'){if(visibleEnemies(s).length){addLog(s,'The moonwell stays still while enemies are near.');return false;}o.used=true;heal(s,Math.ceil(s.hero.maxHp*.55));s.hero.statuses={};addLog(s,'Moonwater mends your wounds and cleanses every ailment.','good');return true;}
  if(o.type==='stairs'){
    if(s.floor>=3)return false;
    s.floor++;generateFloor(s);heal(s,5);addLog(s,`You descend. Floor ${s.floor+1} of 4. +5 health.`,'story');return true;
  }
  if(o.type==='beacon'){
    if(!s.bossDefeated){addLog(s,'The beacon is bound to the Lantern Warden.','story');return false;}
    s.phase='won';o.used=true;addLog(s,'You return the stolen dawn. Somewhere above, the birds begin.','story');event(s,'win',o.x,o.y,'DAWN RETURNS','#f4d492');return true;
  }return false;
}
function useItem(s,id){
  const i=s.inventory.find(i=>i.id===id&&i.qty>0),d=ITEMS[id];if(!i||!d)return false;
  if(d.type==='weapon'||d.type==='armour'){const slot=d.type;if(s.hero[slot]===id)return false;const old=s.hero[slot];removeItem(s,id);addItem(s,old);s.hero[slot]=id;addLog(s,`Equipped ${d.name}.`,'loot');return true;}
  if((id==='healing'||id==='ration')&&s.hero.hp===s.hero.maxHp&&!s.hero.statuses.burn){addLog(s,'You are already at full health.');return false;}
  if(id==='ration'&&visibleEnemies(s).length){addLog(s,'Find a quiet spot before eating.');return false;}
  if((id==='fire'||id==='frost')&&!visibleEnemies(s).length){addLog(s,'There are no enemies in sight.');return false;}
  if(id==='blink'){
    const candidates=[];for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(passable(s,x,y)&&s.explored[key(x,y)]&&!enemyAt(s,x,y)&&distance(s.hero,{x,y})>=5&&!s.enemies.some(e=>e.hp>0&&distance(e,{x,y})<5)&&!s.objects.some(o=>!o.used&&o.x===x&&o.y===y))candidates.push({x,y});
    if(!candidates.length){addLog(s,'The scroll cannot find a safe landing.');return false;}
    const p=pick(s,candidates);s.hero.x=p.x;s.hero.y=p.y;s.hero.statuses.guard=4;updateVision(s);
  }
  removeItem(s,id);addLog(s,`Used ${d.name}.`,'good');
  if(id==='healing'){heal(s,22);delete s.hero.statuses.burn;}
  if(id==='ration')heal(s,14);
  if(id==='antidote'){for(const st of ['poison','slow','stun'])delete s.hero.statuses[st];heal(s,8);}
  if(id==='might')s.hero.statuses.might=11;
  if(id==='frost')for(const e of visibleEnemies(s)){hurtEnemy(s,e,7);if(e.hp>0)e.statuses.stun=3;}
  if(id==='fire')for(const e of visibleEnemies(s)){hurtEnemy(s,e,10);if(e.hp>0)e.statuses.burn=3;}
  return true;
}
function enemyMove(s,e){const p=findPath(s,e,s.hero,{known:false,avoidTraps:false})[0];if(p&&distance(p,s.hero)>0){e.x=p.x;e.y=p.y;}}
function mark(s,e,kind,cells){e.intent={kind,cells:cells.filter(p=>passable(s,p.x,p.y)&&lineOfSight(s,e,p))};event(s,'warning',e.x,e.y,kind==='spores'?'SPORES':kind==='spell'?'HEX':'WIND-UP','#f9bb85');}
export function dangerCells(s){return s.enemies.filter(e=>e.hp>0&&s.visible[key(e.x,e.y)]&&e.intent).flatMap(e=>e.intent.cells);}
function enemyTurn(s,e){
  if(e.hp<=0)return;
  if(e.statuses.burn){e.statuses.burn--;hurtEnemy(s,e,2);if(e.hp<=0)return;}
  if(e.statuses.stun){e.statuses.stun--;return;}
  if(e.recovery){e.recovery--;return;}
  const d=distance(e,s.hero),canSee=d<=8&&lineOfSight(s,e,s.hero);if(canSee)e.alert=true;if(!e.alert)return;e.turns++;
  if(e.intent){const hit=e.intent.cells.some(p=>p.x===s.hero.x&&p.y===s.hero.y);event(s,'blast',e.x,e.y,'','#ffbc88');if(hit){const dmg=damageHero(s,Math.max(1,e.attack+3-stats(s).defence),ENEMIES[e.type].name);addLog(s,`${ENEMIES[e.type].name}'s ${e.intent.kind} hits for ${dmg}.`,'danger');if(e.intent.kind==='spores')s.hero.statuses.poison=4;if(e.intent.kind==='spell')s.hero.statuses.burn=3;}e.intent=null;e.recovery=1;return;}
  if(e.type==='boss'){
    if(e.hp<e.maxHp*.5&&!e.summoned){e.summoned=true;for(const [dx,dy]of DIRS.slice(0,4)){const p={x:e.x+dx,y:e.y+dy};if(passable(s,p.x,p.y)&&!enemyAt(s,p.x,p.y)&&distance(s.hero,p)>0){const slime=spawnEnemy(s,'slime',p.x,p.y);slime.alert=true;}}addLog(s,'The Warden breaks its seal. Slimes spill from the lantern!','danger');return;}
    if(canSee&&e.turns%3===1){const cells=[];if(e.turns%2){for(let n=-4;n<=4;n++){cells.push({x:e.x+n,y:e.y});cells.push({x:e.x,y:e.y+n});}}else{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===2)cells.push({x:s.hero.x+dx,y:s.hero.y+dy});cells.push({x:s.hero.x,y:s.hero.y});}mark(s,e,'lantern flare',cells);return;}
  }
  if(e.type==='wisp'&&canSee&&d<=5){mark(s,e,'spell',[{x:s.hero.x,y:s.hero.y}]);return;}
  if(e.type==='shroom'&&d<=1&&canSee){const cells=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)cells.push({x:e.x+dx,y:e.y+dy});mark(s,e,'spores',cells);return;}
  if(d===1&&canStep(s,e,s.hero)){
    if(['slime','skeleton'].includes(e.type)&&e.turns%3===1){mark(s,e,'heavy strike',[{x:s.hero.x,y:s.hero.y}]);return;}
    const dmg=damageHero(s,Math.max(1,e.attack+integer(s,-1,1)-stats(s).defence),ENEMIES[e.type].name);addLog(s,`${ENEMIES[e.type].name} hits you for ${dmg}.`,'danger');if(e.type==='bat'&&e.turns%3===0)s.hero.statuses.slow=3;
  }else enemyMove(s,e);
}
function tick(s){
  const h=s.hero,slow=!!h.statuses.slow;s.turn++;
  for(const st of ['poison','burn'])if(h.statuses[st]){damageHero(s,2,st==='poison'?'poison':'burning');if(s.phase!=='playing')return;}
  for(const st of Object.keys(h.statuses)){h.statuses[st]--;if(h.statuses[st]<=0)delete h.statuses[st];}
  const rounds=slow&&s.turn%2===0?2:1;
  for(let i=0;i<rounds;i++)for(const e of [...s.enemies]){enemyTurn(s,e);if(s.phase!=='playing')return;}
  updateVision(s);
}
export function act(s,action){
  if(s.phase!=='playing')return {spent:false,reason:'finished'};s.events=[];
  if(action.type==='talent'){
    if(!s.pendingTalents||!['vitality','edge','ward'].includes(action.id))return {spent:false};
    const h=s.hero;if(action.id==='vitality'){h.maxHp+=8;heal(s,8);}if(action.id==='edge')h.baseAttack+=2;if(action.id==='ward')h.baseDefence++;h.talents.push(action.id);s.pendingTalents--;addLog(s,'Your resolve takes shape.','good');return {spent:false,talent:true};
  }
  if(s.pendingTalents)return {spent:false,reason:'talent'};
  if(s.hero.statuses.stun&&!(action.type==='item'&&action.id==='antidote')){addLog(s,'You struggle against the frost.');tick(s);return {spent:true};}
  let spent=false,changedFloor=false;
  if(action.type==='move'){
    const p={x:s.hero.x+action.dx,y:s.hero.y+action.dy};if(!canStep(s,s.hero,p))return {spent:false,reason:'wall'};
    const e=enemyAt(s,p.x,p.y),o=objectAt(s,p.x,p.y);
    if(e){attack(s,e);spent=true;}
    else if(o?.type==='chest'){spent=interact(s,o);}
    else{s.hero.x=p.x;s.hero.y=p.y;collect(s);spent=true;}
  }
  if(action.type==='wait'){spent=true;event(s,'wait',s.hero.x,s.hero.y,'WAIT','#b6c7d1');}
  if(action.type==='interact'){const f=s.floor;spent=interact(s,s.objects.find(o=>o.id===action.id));changedFloor=s.floor!==f;}
  if(action.type==='item')spent=useItem(s,action.id);
  if(spent&&s.phase==='playing'){if(changedFloor){s.turn++;updateVision(s);}else tick(s);}
  else if(spent)s.turn++;
  return {spent,changedFloor};
}
export function serialize(s){return JSON.stringify(s);}
export function deserialize(raw){
  try{
    if(typeof raw!=='string'||raw.length>500000)return null;
    const s=JSON.parse(raw),uint=n=>Number.isSafeInteger(n)&&n>=0;
    const status=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>Object.hasOwn(STATUSES,k)&&uint(n)&&n<=1000);
    const position=p=>p&&inside(p.x,p.y)&&passable(s,p.x,p.y);
    const item=i=>i&&Object.hasOwn(ITEMS,i.id)&&uint(i.qty)&&i.qty>0;
    const h=s?.hero;
    if(s?.version!==VERSION||!uint(s.floor)||s.floor>3||!['playing','dead','won'].includes(s.phase)||!h)return null;
    if(!['seed','rng','turn','uid','kills','gold','hits','pendingTalents'].every(k=>uint(s[k]))||s.rng>0xffffffff)return null;
    if(!Array.isArray(s.map)||s.map.length!==W*H||!s.map.every(t=>t===0||t===1)||!position(h))return null;
    if(!['hp','maxHp','level','xp','nextXp','baseAttack','baseDefence'].every(k=>uint(h[k]))||!h.maxHp||h.hp>h.maxHp||!h.level||!h.nextXp||(s.phase==='playing'&&!h.hp))return null;
    if(!Object.hasOwn(ITEMS,h.weapon)||ITEMS[h.weapon].type!=='weapon'||!Object.hasOwn(ITEMS,h.armour)||ITEMS[h.armour].type!=='armour'||!status(h.statuses)||!Array.isArray(h.talents)||!h.talents.every(t=>['vitality','edge','ward'].includes(t)))return null;
    for(const a of ['explored','visible'])if(!Array.isArray(s[a])||s[a].length!==W*H||!s[a].every(v=>typeof v==='boolean'))return null;
    for(const a of ['enemies','objects','inventory','log','discovered','rooms','hazards'])if(!Array.isArray(s[a]))return null;
    if(!s.inventory.every(item)||!s.discovered.every(t=>Object.hasOwn(ENEMIES,t))||!s.log.every(l=>l&&typeof l.text==='string'&&['normal','danger','good','loot','story'].includes(l.tone)&&uint(l.turn)))return null;
    if(!s.enemies.every(e=>Object.hasOwn(ENEMIES,e.type)&&position(e)&&['id','hp','maxHp','attack','defence','xp','turns'].every(k=>uint(e[k]))&&e.maxHp>0&&e.hp<=e.maxHp&&status(e.statuses)&&(!e.intent||(typeof e.intent.kind==='string'&&Array.isArray(e.intent.cells)&&e.intent.cells.every(position)))))return null;
    if(!s.objects.every(o=>position(o)&&uint(o.id)&&typeof o.used==='boolean'&&['stairs','beacon','chest','shrine','item','gold','trap'].includes(o.type)&&(o.type!=='item'||Object.hasOwn(ITEMS,o.item))&&(o.type!=='gold'||uint(o.amount))&&(o.type!=='chest'||(Array.isArray(o.loot)&&o.loot.every(item)&&typeof o.mimic==='boolean'))))return null;
    s.events=[];updateVision(s);return s;
  }catch{return null;}
}
