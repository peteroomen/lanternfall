import {pathToFileURL} from 'node:url';
import {newGame,act,stats,visibleEnemies,findPath,explorationPath,canStep,canInteract,enemyAt,objectAt,updateVision,dangerCells,distance,key,DIRS,serialize,deserialize} from '../dist/game/engine.js';
import {ITEMS} from '../dist/game/catalog.js';

// This player uses the same public actions as the UI. No bonus HP, equipment,
// revealed map, teleports or direct mutations of the game state are allowed.
export function chooseAction(s,{careful=true,press=false}={}){
  const h=s.hero,own=id=>s.inventory.some(i=>i.id===id&&i.qty>0),use=id=>({type:'item',id}),wait={type:'wait'};
  const move=p=>({type:'move',dx:p.x-h.x,dy:p.y-h.y});
  if(s.pendingTalents)return {type:'talent',id:h.talents.length%3===1?'ward':'edge'};
  const enemies=visibleEnemies(s).sort((a,b)=>distance(h,a)-distance(h,b)||a.hp-b.hp);
  const danger=dangerCells(s),marked=p=>danger.some(t=>t.x===p.x&&t.y===p.y);
  const adjacent=enemies.filter(e=>canStep(s,h,e));
  if(careful){
    if(own('antidote')&&(h.statuses.poison||h.statuses.slow||h.statuses.stun))return use('antidote');
    if(own('healing')&&(h.hp<=h.maxHp-22||h.statuses.burn||h.hp<=12))return use('healing');
    if(!enemies.length&&own('ration')&&h.hp<=h.maxHp-14)return use('ration');
    if(own('frost')&&enemies.some(e=>!e.statuses.stun)&&(enemies.length>=3||(marked(h)&&h.hp<24)))return use('frost');
    if(own('fire')&&enemies.reduce((sum,e)=>sum+e.hp,0)>=32)return use('fire');
    if(own('might')&&!h.statuses.might&&enemies.some(e=>e.type==='boss'||e.type==='mimic'))return use('might');
    if(marked(h)){
      // Occasionally accept a survivable hit to break alternating enemy zones.
      if(press&&adjacent.length&&h.hp>h.maxHp*.4)return move(adjacent[0]);
      const charging=adjacent.find(e=>e.intent&&e.hp<=Math.max(1,stats(s).attack-1-e.defence));
      if(charging)return move(charging);
      const options=DIRS.map(([dx,dy])=>({x:h.x+dx,y:h.y+dy})).filter(p=>canStep(s,h,p)&&!enemyAt(s,p.x,p.y)&&!marked(p)&&!s.objects.some(o=>!o.used&&o.x===p.x&&o.y===p.y&&['trap','chest'].includes(o.type)));
      options.sort((a,b)=>distance(a,enemies[0]||h)-distance(b,enemies[0]||h));
      if(options.length)return move(options[0]);
    }
  }
  if(adjacent.length)return move(adjacent.sort((a,b)=>a.hp-b.hp)[0]);
  if(enemies.length){for(const e of enemies){const p=findPath(s,h,e)[0];if(p)return move(p);}}
  if(careful){
    const upgrade=s.inventory.filter(i=>['weapon','armour'].includes(ITEMS[i.id].type)&&ITEMS[i.id].power>ITEMS[h[ITEMS[i.id].type]].power).sort((a,b)=>ITEMS[b.id].power-ITEMS[a.id].power)[0];
    if(upgrade)return use(upgrade.id);
  }
  const goals=s.objects.filter(o=>!o.used&&s.explored[key(o.x,o.y)]&&(['item','gold','chest'].includes(o.type)||(o.type==='shrine'&&!enemies.length&&h.hp<=h.maxHp-12)||(o.type==='beacon'&&s.bossDefeated)));
  const routes=goals.map(o=>({o,path:findPath(s,h,o)})).filter(({o,path})=>path.length||canInteract(s,o)).sort((a,b)=>a.path.length-b.path.length);
  for(const{o,path}of routes){if(['chest','shrine','beacon'].includes(o.type)&&canInteract(s,o))return{type:'interact',id:o.id};if(path.length)return move(path[0]);}
  const frontier=explorationPath(s)[0];if(frontier)return move(frontier);
  const exit=s.objects.find(o=>['stairs','beacon'].includes(o.type)&&s.explored[key(o.x,o.y)]);
  if(exit){if(canInteract(s,exit))return {type:'interact',id:exit.id};const p=findPath(s,h,exit)[0];if(p)return move(p);}
  return wait;
}

export function simulate(seed,{careful=true,maxActions=5000,resume=false}={}){
  let s=newGame(seed),actions=0,rejected=0,lastKill=0,kills=0;const floors=new Set([0]);
  while(s.phase==='playing'&&actions<maxActions){
    const action=chooseAction(s,{careful,press:actions-lastKill>35}),result=act(s,action);actions++;
    if(s.kills!==kills){kills=s.kills;lastKill=actions;}
    if(!result.spent&&!result.talent)rejected++;
    floors.add(s.floor);
    if(resume&&actions%23===0){s=deserialize(serialize(s));if(!s)throw Error(`Save rejected at seed ${seed}, action ${actions}`);}
    if(!Number.isFinite(s.hero.hp)||s.hero.hp<0||s.hero.hp>s.hero.maxHp)throw Error(`Invalid HP at seed ${seed}`);
  }
  return {seed,phase:s.phase,floor:s.floor+1,turns:s.turn,actions,hp:s.hero.hp,level:s.hero.level,kills:s.kills,rejected,floors:[...floors],cause:s.cause||null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const count=Number(process.argv[2])||50,results=[];
  for(const careful of [true,false]){
    const runs=Array.from({length:count},(_,seed)=>simulate(seed,{careful}));
    results.push({player:careful?'careful':'reckless',runs:count,wins:runs.filter(r=>r.phase==='won').length,deaths:runs.filter(r=>r.phase==='dead').length,unfinished:runs.filter(r=>r.phase==='playing').length,meanTurns:Math.round(runs.reduce((n,r)=>n+r.turns,0)/count),floorsReached:[1,2,3,4].map(f=>runs.filter(r=>r.floor>=f).length),examples:runs.filter(r=>r.phase==='playing').slice(0,3)});
  }
  console.log(JSON.stringify(results,null,2));
}
