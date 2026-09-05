export const FLOORS = [
  {name:'Mosslit Steps',subtitle:'Where small things grow teeth.',color:'#70cbb4',wall:'#253a43',ground:'#1e3037',accent:'#83caae'},
  {name:'Moonwell Vaults',subtitle:'The water remembers your name.',color:'#89b8f1',wall:'#303c58',ground:'#222b43',accent:'#81b7e5'},
  {name:'Glassroot Sanctum',subtitle:'Every flower has a hunger.',color:'#c6a4f2',wall:'#403851',ground:'#30293e',accent:'#c5a0e6'},
  {name:'The Hollow Crown',subtitle:'Someone has kept the light burning.',color:'#e8ba6b',wall:'#483e3b',ground:'#302e32',accent:'#e1ba77'},
];
export const ITEMS = {
  rustySword:{name:'Wayfarer’s blade',type:'weapon',power:2,tier:0,sprite:13,desc:'A reliable little sword. +2 attack.'},
  moonblade:{name:'Moonsteel sabre',type:'weapon',power:4,tier:1,sprite:13,desc:'+4 attack. A clean edge, cold as moonlight.'},
  emberBlade:{name:'Emberthorn',type:'weapon',power:5,tier:2,sprite:13,effect:'burn',desc:'+5 attack. Every third hit burns for 3 turns.'},
  crownBlade:{name:'Dawnbreaker',type:'weapon',power:7,tier:3,sprite:13,desc:'+7 attack. The last sunrise, forged into steel.'},
  cloak:{name:'Traveller’s coat',type:'armour',power:1,tier:0,sprite:14,desc:'Patched and practical. +1 defence.'},
  mail:{name:'Warden’s mail',type:'armour',power:2,tier:1,sprite:14,desc:'+2 defence. Old brass over quiet leather.'},
  moonArmour:{name:'Moonwoven mantle',type:'armour',power:3,tier:2,sprite:14,desc:'+3 defence. Silver thread catches the light.'},
  crownArmour:{name:'Dawnplate',type:'armour',power:4,tier:3,sprite:14,desc:'+4 defence. Made for the one who comes back.'},
  healing:{name:'Crimson tonic',type:'potion',sprite:10,desc:'Restore 22 health. Clears burning.'},
  antidote:{name:'Clearwater draught',type:'potion',sprite:12,desc:'Cure poison, slow and stun. Restore 8 health.'},
  might:{name:'Bottled courage',type:'potion',sprite:12,desc:'+3 attack for your next 10 turns.'},
  frost:{name:'Scroll of winter',type:'scroll',sprite:11,desc:'Freeze visible enemies for 3 turns and deal 7 damage.'},
  fire:{name:'Scroll of cinders',type:'scroll',sprite:11,desc:'Deal 10 damage and burn all visible enemies.'},
  blink:{name:'Scroll of passage',type:'scroll',sprite:11,desc:'Escape to a safe, explored tile. Gain a 3-turn ward.'},
  ration:{name:'Honeybread',type:'food',sprite:8,desc:'Restore 14 health. Only edible when no enemy can see you.'},
};
export const ENEMIES = {
  slime:{name:'Dewdrop slime',sprite:1,hp:10,attack:4,defence:0,xp:5,ai:'slime',desc:'A cheerful blob with terrible manners. It gathers itself before a heavy splash.'},
  bat:{name:'Duskwing',sprite:2,hp:8,attack:4,defence:0,xp:5,ai:'bat',desc:'Quick and fragile. Its bite can slow you for 3 turns.'},
  shroom:{name:'Sporekin',sprite:3,hp:12,attack:4,defence:1,xp:7,ai:'shroom',desc:'A walking mushroom. Its telegraphed spore cloud poisons nearby tiles.'},
  skeleton:{name:'Hollow knight',sprite:4,hp:18,attack:6,defence:2,xp:9,ai:'skeleton',desc:'An old oath in an empty suit. Its heavy strike takes a turn to prepare.'},
  wisp:{name:'Moonveil wisp',sprite:5,hp:13,attack:5,defence:0,xp:8,ai:'wisp',desc:'Marks your tile with pale fire. Step away before its spell lands.'},
  mimic:{name:'Gilded mimic',sprite:6,hp:25,attack:7,defence:1,xp:15,ai:'mimic',desc:'That chest had far too many teeth. Sturdy, hungry, and full of stolen treasure.'},
  boss:{name:'The Lantern Warden',sprite:7,hp:150,attack:12,defence:2,xp:40,ai:'boss',desc:'The keeper of a borrowed dawn. Dodge its marked cross and ring attacks, then strike while it recovers. Below half health, it calls slimes.'},
};
export const STATUSES = {
  poison:{label:'Poison',color:'#a1d980',desc:'Lose 2 health each turn.'},
  burn:{label:'Burning',color:'#ffa578',desc:'Lose 2 health each turn.'},
  slow:{label:'Slowed',color:'#8dc8f2',desc:'Every other action gives enemies an extra turn.'},
  stun:{label:'Frozen',color:'#98dce5',desc:'Cannot act until thawed.'},
  might:{label:'Courage',color:'#edc379',desc:'+3 attack.'},
  guard:{label:'Warded',color:'#bad7f4',desc:'Incoming damage is reduced by 3.'},
};
export const TALENTS = [
  {id:'vitality',name:'Stout heart',icon:'heart',desc:'+8 maximum health. Recover 8 health.'},
  {id:'edge',name:'Keen edge',icon:'sword',desc:'+2 attack, for the rest of this run.'},
  {id:'ward',name:'Iron resolve',icon:'shield',desc:'+1 defence, for the rest of this run.'},
];
