import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,act,stats,serialize,deserialize,generateFloor,spawnEnemy,updateVision,findPath,explorationPath,canStep,canInteract,enemyAt,passable,lineOfSight,distance,DIRS,W,H,key,hurtEnemy,addItem} from '../dist/game/engine.js';

function arena(seed=17){const s=newGame(seed);s.map=Array(W*H).fill(0);for(let y=2;y<14;y++)for(let x=2;x<14;x++)s.map[key(x,y)]=1;s.hero.x=6;s.hero.y=6;s.enemies=[];s.objects=[];s.explored.fill(false);updateVision(s);return s;}
const move=(s,dx,dy)=>act(s,{type:'move',dx,dy});
const wait=s=>act(s,{type:'wait'});
const object=(s,type,x,y,extra={})=>{const o={id:s.uid++,type,x,y,used:false,...extra};s.objects.push(o);return o;};

test('same seed and actions reproduce the same dungeon and random outcomes',()=>{
  const a=newGame(0),b=newGame(0);assert.deepEqual(a,b);
  for(let i=0;i<30;i++){const action={type:i%3?'move':'wait',dx:1,dy:0};act(a,action);act(b,action);}assert.deepEqual(a,b);
  assert.notDeepEqual(newGame(1).map,newGame(2).map);
});

test('200 seeds × four floors have connected rooms, valid spawns and reachable exits',()=>{
  for(let seed=0;seed<200;seed++)for(let floor=0;floor<4;floor++){
    const s=newGame(seed);s.floor=floor;generateFloor(s);
    const queue=[s.hero],seen=new Set([key(s.hero.x,s.hero.y)]);
    for(let i=0;i<queue.length;i++)for(const[dx,dy]of DIRS){const p={x:queue[i].x+dx,y:queue[i].y+dy},k=key(p.x,p.y);if(!seen.has(k)&&canStep(s,queue[i],p)){seen.add(k);queue.push(p);}}
    assert.equal(seen.size,s.map.filter(Boolean).length,`disconnected seed ${seed}, floor ${floor}`);
    const occupied=new Set([key(s.hero.x,s.hero.y)]);
    for(const p of [...s.enemies,...s.objects]){assert.ok(seen.has(key(p.x,p.y)));assert.ok(!occupied.has(key(p.x,p.y)));occupied.add(key(p.x,p.y));}
    assert.equal(s.enemies.filter(e=>e.type==='boss').length,floor===3?1:0);
    assert.equal(s.objects.filter(o=>o.type===(floor===3?'beacon':'stairs')).length,1);
  }
});

test('blocked and invalid movement is free; a valid move or wait takes one turn',()=>{
  const s=arena();s.map[key(7,6)]=0;const before=serialize(s);
  assert.equal(move(s,1,0).spent,false);assert.equal(serialize(s),before);
  assert.equal(move(s,2,0).spent,false);assert.equal(move(s,.5,1).spent,false);
  assert.equal(move(s,-1,0).spent,true);assert.equal(s.turn,1);wait(s);assert.equal(s.turn,2);
});

test('diagonal movement and interaction cannot cut through corners',()=>{
  const s=arena();s.map[key(7,6)]=0;const chest=object(s,'chest',7,7,{loot:[],mimic:false});
  assert.equal(move(s,1,1).spent,false);assert.equal(canInteract(s,chest),false);assert.equal(act(s,{type:'interact',id:chest.id}).spent,false);assert.equal(chest.used,false);
});

test('line of sight is reciprocal, including corridor corners',()=>{
  for(const seed of [0,19,37,99]){const s=newGame(seed),cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(passable(s,x,y))cells.push({x,y});
    for(let i=0;i<cells.length;i+=3)for(let j=0;j<cells.length;j+=7)assert.equal(lineOfSight(s,cells[i],cells[j]),lineOfSight(s,cells[j],cells[i]));
  }
});

test('pathfinding avoids known traps and chests except an explicitly selected destination',()=>{
  const s=arena();object(s,'trap',7,6,{hidden:false});object(s,'chest',8,6,{loot:[],mimic:false});
  const path=findPath(s,s.hero,{x:10,y:6});assert.ok(path.length);assert.ok(path.every(p=>!(p.y===6&&[7,8].includes(p.x))));
  assert.deepEqual(findPath(s,s.hero,{x:7,y:6}),[{x:7,y:6}]);
});

test('auto-exploration advances through reachable unknown ground and terminates',()=>{
  for(const seed of [1,7,42,101,999]){const s=newGame(seed);s.enemies=[];s.objects=[];let n=0;
    while(n++<1800){const p=explorationPath(s)[0];if(!p)break;assert.equal(move(s,p.x-s.hero.x,p.y-s.hero.y).spent,true);}
    assert.ok(n<1800);assert.equal(s.map.filter((t,i)=>t&&!s.explored[i]).length,0,`seed ${seed}`);
  }
});

test('enemies pursue around a wall instead of getting trapped by greedy movement',()=>{
  const s=arena();s.hero.x=9;s.hero.y=6;for(let y=3;y<=8;y++)s.map[key(7,y)]=0;
  const e=spawnEnemy(s,'skeleton',5,6);e.alert=true;
  for(let i=0;i<20&&distance(s.hero,e)>1;i++)wait(s);
  assert.equal(distance(s.hero,e),1);
});

test('a heavy strike is telegraphed for a turn and stepping aside avoids it',()=>{
  const s=arena(),e=spawnEnemy(s,'slime',7,6);updateVision(s);wait(s);assert.ok(e.intent);assert.equal(s.hero.hp,38);
  move(s,-1,0);assert.equal(s.hero.hp,38);assert.equal(e.intent,null);
  assert.equal(e.recovery,1);wait(s);assert.equal(e.recovery,0);assert.equal(s.hero.hp,38);
  e.x=s.hero.x+1;e.y=s.hero.y;e.turns=0;wait(s);wait(s);assert.ok(s.hero.hp<38);
});

test('sporekin approaches before preparing a cloud that can actually reach the hero',()=>{
  const s=arena(),e=spawnEnemy(s,'shroom',8,6);wait(s);assert.equal(distance(s.hero,e),1);assert.equal(e.intent,null);
  wait(s);assert.ok(e.intent.cells.some(p=>p.x===s.hero.x&&p.y===s.hero.y));
});

test('chests award gear and mimics only release their loot after defeat',()=>{
  const s=arena(),chest=object(s,'chest',7,6,{loot:[{id:'moonblade',qty:1}],mimic:false});
  move(s,1,0);assert.equal(chest.used,true);assert.equal(s.hero.x,6);assert.ok(s.inventory.some(i=>i.id==='moonblade'));
  const mimicChest=object(s,'chest',6,7,{loot:[{id:'moonArmour',qty:1}],mimic:true});move(s,0,1);const e=enemyAt(s,6,7);
  assert.equal(e.type,'mimic');assert.equal(mimicChest.used,true);assert.ok(!s.inventory.some(i=>i.id==='moonArmour'));
  hurtEnemy(s,e,100);assert.ok(s.inventory.some(i=>i.id==='moonArmour'));const qty=s.inventory.find(i=>i.id==='moonArmour').qty;
  hurtEnemy(s,e,100);assert.equal(s.inventory.find(i=>i.id==='moonArmour').qty,qty);
});

test('equipment swaps preserve both items and spend exactly one turn',()=>{
  const s=arena();addItem(s,'moonblade');const before=stats(s).attack;act(s,{type:'item',id:'moonblade'});
  assert.equal(stats(s).attack,before+2);assert.equal(s.hero.weapon,'moonblade');assert.ok(s.inventory.some(i=>i.id==='rustySword'));assert.equal(s.turn,1);
  act(s,{type:'item',id:'rustySword'});assert.equal(stats(s).attack,before);assert.ok(s.inventory.some(i=>i.id==='moonblade'));assert.equal(s.turn,2);
});

test('healing caps at maximum and useless healing is not consumed',()=>{
  const s=arena();assert.equal(act(s,{type:'item',id:'healing'}).spent,false);assert.equal(s.inventory.find(i=>i.id==='healing').qty,3);
  s.hero.hp=10;s.hero.statuses.burn=3;act(s,{type:'item',id:'healing'});assert.equal(s.hero.hp,32);assert.equal(s.hero.statuses.burn,undefined);assert.equal(s.turn,1);
});

test('status duration, antidote, courage and slow affect the promised turns',()=>{
  const s=arena();s.hero.statuses.poison=3;wait(s);wait(s);wait(s);assert.equal(s.hero.hp,32);wait(s);assert.equal(s.hero.hp,32);
  s.hero.statuses={poison:4,stun:2,slow:3};act(s,{type:'item',id:'antidote'});assert.deepEqual(s.hero.statuses,{});assert.equal(s.hero.hp,38);
  addItem(s,'might');const base=stats(s).attack;act(s,{type:'item',id:'might'});assert.equal(stats(s).attack,base+3);assert.equal(s.hero.statuses.might,10);
  for(let i=0;i<10;i++)wait(s);assert.equal(stats(s).attack,base);
  const e=spawnEnemy(s,'bat',11,11);e.alert=true;s.hero.statuses.slow=2;s.turn=0;wait(s);assert.equal(e.turns,1);wait(s);assert.equal(e.turns,3);
});

test('winter freezes enemies for three enemy turns and cinders burns them',()=>{
  const s=arena(),e=spawnEnemy(s,'boss',7,6);updateVision(s);act(s,{type:'item',id:'frost'});assert.equal(e.hp,e.maxHp-7);assert.equal(e.turns,0);
  wait(s);wait(s);assert.equal(e.turns,0);wait(s);assert.equal(e.turns,1);
  addItem(s,'fire');act(s,{type:'item',id:'fire'});assert.equal(e.hp,e.maxHp-19);assert.equal(e.statuses.burn,2);
});

test('passage uses only safe explored ground and grants a ward',()=>{
  const s=arena();s.explored.fill(true);addItem(s,'blink');const from={...s.hero};assert.equal(act(s,{type:'item',id:'blink'}).spent,true);
  assert.ok(distance(from,s.hero)>=5);assert.ok(passable(s,s.hero.x,s.hero.y));assert.equal(s.hero.statuses.guard,3);
});

test('moonwell is unavailable during combat, heals once, and clears ailments',()=>{
  const s=arena(),o=object(s,'shrine',7,6);s.hero.hp=10;spawnEnemy(s,'slime',8,6);updateVision(s);assert.equal(act(s,{type:'interact',id:o.id}).spent,false);
  s.enemies=[];s.hero.statuses.poison=3;act(s,{type:'interact',id:o.id});assert.equal(s.hero.hp,31);assert.deepEqual(s.hero.statuses,{});assert.equal(o.used,true);assert.equal(act(s,{type:'interact',id:o.id}).spent,false);
});

test('leveling requires a free talent choice before the next turn',()=>{
  const s=arena();s.hero.xp=13;const e=spawnEnemy(s,'slime',7,6);e.hp=1;move(s,1,0);assert.equal(s.hero.level,2);assert.equal(s.pendingTalents,1);
  const turn=s.turn;assert.equal(wait(s).reason,'talent');assert.equal(s.turn,turn);const attack=stats(s).attack;
  assert.equal(act(s,{type:'talent',id:'edge'}).talent,true);assert.equal(stats(s).attack,attack+2);assert.equal(s.turn,turn);assert.equal(s.pendingTalents,0);
});

test('stairs preserve equipment, inventory and XP, while generating the next floor',()=>{
  const s=arena(),o=object(s,'stairs',6,6);s.hero.weapon='moonblade';s.hero.hp=25;const inventory=structuredClone(s.inventory);
  const result=act(s,{type:'interact',id:o.id});assert.equal(result.changedFloor,true);assert.equal(s.floor,1);assert.equal(s.hero.hp,30);assert.equal(s.hero.weapon,'moonblade');assert.deepEqual(s.inventory,inventory);assert.equal(s.turn,1);assert.ok(deserialize(serialize(s)));
});

test('boss summons once below half health and the beacon requires its defeat',()=>{
  const s=arena();s.floor=3;const boss=spawnEnemy(s,'boss',8,6),beacon=object(s,'beacon',6,6);updateVision(s);
  assert.equal(act(s,{type:'interact',id:beacon.id}).spent,false);assert.equal(s.phase,'playing');hurtEnemy(s,boss,boss.maxHp/2+1);wait(s);assert.equal(boss.summoned,true);
  const summoned=s.enemies.filter(e=>e.type==='slime').length;assert.ok(summoned>0);wait(s);assert.equal(s.enemies.filter(e=>e.type==='slime').length,summoned);
  hurtEnemy(s,boss,100);while(s.pendingTalents)act(s,{type:'talent',id:'ward'});act(s,{type:'interact',id:beacon.id});assert.equal(s.phase,'won');assert.equal(beacon.used,true);assert.equal(wait(s).reason,'finished');
});

test('lethal traps count the final action and death stops every later action',()=>{
  const s=arena();s.hero.hp=3;object(s,'trap',7,6,{hidden:false});move(s,1,0);assert.equal(s.phase,'dead');assert.equal(s.turn,1);assert.equal(s.hero.hp,0);
  const before=serialize(s);assert.equal(wait(s).spent,false);assert.equal(serialize(s),before);
});

test('save/resume preserves future random outcomes and rejects corrupt saves',()=>{
  const s=arena();spawnEnemy(s,'slime',7,6);updateVision(s);wait(s);const resumed=deserialize(serialize(s));assert.ok(resumed);
  for(const action of [{type:'move',dx:-1,dy:0},{type:'wait'},{type:'move',dx:1,dy:0}]){act(s,action);act(resumed,action);}assert.deepEqual(s,resumed);
  for(const corrupt of [null,'{','[]','null','x'.repeat(500001)])assert.equal(deserialize(corrupt),null);
  const changes=[x=>x.hero.weapon='healing',x=>x.hero.armour='toString',x=>x.hero.x=.5,x=>x.hero.hp=-1,x=>x.hero.level=null,x=>x.hero.statuses={other:3},x=>x.pendingTalents=-1,x=>x.map.pop(),x=>x.log=[{text:'a',tone:'bad"',turn:0}],x=>x.objects=[{type:'item',x:6,y:6,id:99,used:false,item:'missing'}],x=>x.enemies[0].intent={kind:'spell',cells:[{x:99,y:99}]}];
  for(const mutate of changes){const copy=structuredClone(s);mutate(copy);assert.equal(deserialize(serialize(copy)),null);}
});
