import {W,H,key,tile,dangerCells} from './engine.js';
import {FLOORS,ENEMIES,ITEMS} from './catalog.js';

const noise=(x,y,n=1)=>{const z=Math.sin(x*127.1+y*311.7+n*74.7)*43758.5453;return z-Math.floor(z);};
export class DungeonRenderer {
  constructor(canvas,onTile){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onTile=onTile;this.atlas=new Image();this.atlas.src='./assets/sprites.png';this.state=null;this.fx=[];this.camera={x:5,y:5};this.path=[];this.selected=null;this.last=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize=()=>{const r=canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*this.dpr);canvas.height=Math.round(r.height*this.dpr);this.size=r.width<600?Math.max(34,Math.floor(r.width/10.5)):50;};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);this.resize();
    canvas.addEventListener('pointerdown',e=>{if(e.isPrimary===false)return;this.down={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointerup',e=>{const down=this.down;this.down=null;if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>16)return;const r=canvas.getBoundingClientRect();const x=Math.floor((e.clientX-r.left-this.width/2)/this.size+this.camera.x+.5),y=Math.floor((e.clientY-r.top-this.height/2)/this.size+this.camera.y+.5);this.onTile(x,y);});
    canvas.addEventListener('pointercancel',()=>{this.down=null;});
    const loop=t=>{if(!document.hidden&&this.state&&t-this.last>30){this.last=t;this.draw(t);}this.frame=requestAnimationFrame(loop);};this.frame=requestAnimationFrame(loop);
  }
  setState(s,snap=false){this.state=s;if(snap)this.camera={x:s.hero.x,y:s.hero.y};const now=performance.now();for(const e of s.events||[])this.fx.push({...e,start:now});s.events=[];}
  screen(x,y){return {x:(x-this.camera.x)*this.size+this.width/2,y:(y-this.camera.y)*this.size+this.height/2};}
  sprite(index,x,y,size,alpha=1){if(!this.atlas.complete||!this.atlas.naturalWidth)return;const c=this.ctx,cell=this.atlas.width/4;c.globalAlpha=alpha;c.drawImage(this.atlas,(index%4)*cell,Math.floor(index/4)*cell,cell,cell,x-size/2,y-size/2,size,size);c.globalAlpha=1;}
  draw(time){
    const c=this.ctx,s=this.state,f=FLOORS[s.floor],ts=this.size;this.camera.x+=(s.hero.x-this.camera.x)*(this.reduced?1:.28);this.camera.y+=(s.hero.y-this.camera.y)*(this.reduced?1:.28);
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0b111b';c.fillRect(0,0,this.width,this.height);c.imageSmoothingEnabled=true;
    const minx=Math.max(0,Math.floor(this.camera.x-this.width/ts/2)-1),maxx=Math.min(W-1,Math.ceil(this.camera.x+this.width/ts/2)+1),miny=Math.max(0,Math.floor(this.camera.y-this.height/ts/2)-2),maxy=Math.min(H-1,Math.ceil(this.camera.y+this.height/ts/2)+2);
    for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
      if(!s.explored[key(x,y)])continue;const p=this.screen(x,y),l=p.x-ts/2,t=p.y-ts/2,visible=s.visible[key(x,y)],n=noise(x,y,s.floor+1);
      if(tile(s,x,y)){
        c.fillStyle=f.ground;c.fillRect(l,t,ts+1,ts+1);c.fillStyle=`rgba(170,195,206,${.025+n*.045})`;c.fillRect(l+1,t+1,ts-2,ts-2);
        c.strokeStyle='#09141c55';c.lineWidth=1;c.strokeRect(l+1,t+1,ts-2,ts-2);c.fillStyle='#ffffff08';c.fillRect(l+2,t+2,ts-4,1);
        if(n>.62){c.strokeStyle='#0a151b66';c.beginPath();c.moveTo(l+ts*.25,t+ts*.15);c.lineTo(l+ts*.4,t+ts*.46);c.lineTo(l+ts*.34,t+ts*.64);c.stroke();}
        if(n<.22){c.fillStyle=f.accent+'30';for(let k=0;k<5;k++)c.fillRect(l+noise(x,k)*ts,t+noise(y,k+6)*ts,2+noise(k,x)*4,2);}
        if(s.floor===1&&n>.87){c.fillStyle='#72bdf415';c.fillRect(l+3,t+3,ts-6,ts-6);c.fillStyle='#a2d6ef30';c.fillRect(l+6,t+ts*.4,ts*.5,1);}
      }else{
        const front=tile(s,x,y+1);c.fillStyle=front?'#14202c':f.wall;c.fillRect(l,t,ts+1,ts+1);c.fillStyle=f.wall;c.fillRect(l+1,t-(front?ts*.14:0),ts-2,ts*.69);
        c.fillStyle='#9fb0b316';c.fillRect(l+2,t-(front?ts*.14:0),ts-4,2);c.fillStyle='#080e1777';c.fillRect(l+1,t+ts*.65,ts-2,3);
        c.strokeStyle='#101925';c.lineWidth=2;c.beginPath();c.moveTo(l+ts*(y%2?.3:.65),t);c.lineTo(l+ts*(y%2?.3:.65),t+ts*.65);c.stroke();
        if(front&&n>.66&&visible){c.fillStyle=f.accent+'88';for(let k=0;k<3;k++)c.fillRect(l+ts*.25+k*4,t+ts*.1,2,4+k*3);}
      }
      if(!visible){c.fillStyle='#080d18b8';c.fillRect(l-1,t-1,ts+2,ts+2);}
    }
    const danger=dangerCells(s);for(const p of danger){const q=this.screen(p.x,p.y);c.fillStyle=`rgba(245,115,91,${.17+(this.reduced?0:.06*Math.sin(time/160))})`;c.fillRect(q.x-ts/2+2,q.y-ts/2+2,ts-4,ts-4);c.strokeStyle='#f18b6a99';c.lineWidth=1;c.strokeRect(q.x-ts/2+3,q.y-ts/2+3,ts-6,ts-6);}
    for(const p of this.path){const q=this.screen(p.x,p.y);c.fillStyle='#ddc79580';c.beginPath();c.arc(q.x,q.y,2,0,Math.PI*2);c.fill();}
    for(const o of s.objects){if(!s.explored[key(o.x,o.y)]||(o.used&&o.type!=='chest'&&o.type!=='shrine')||o.hidden)continue;const p=this.screen(o.x,o.y);const visible=s.visible[key(o.x,o.y)];c.globalAlpha=visible?1:.25;
      if(o.type==='chest')this.sprite(o.used?9:8,p.x,p.y-3,ts*1.12,visible?1:.3);
      if(o.type==='item')this.sprite(ITEMS[o.item].sprite,p.x,p.y-2+(this.reduced?0:Math.sin(time/550+o.id)*1.5),ts*.73,visible?1:.3);
      if(o.type==='gold'){c.fillStyle='#e8be6c';for(let k=0;k<4;k++){c.beginPath();c.ellipse(p.x-6+k*4,p.y+noise(o.id,k)*6,4,2,0,0,7);c.fill();}}
      if(o.type==='stairs'){c.fillStyle='#101821';c.fillRect(p.x-ts*.38,p.y-ts*.38,ts*.76,ts*.76);for(let k=0;k<5;k++){c.fillStyle=`rgba(169,190,199,${.13+k*.08})`;c.fillRect(p.x-ts*.3+k,p.y-ts*.3+k*ts*.12,ts*.6-k*2,ts*.07);}c.strokeStyle=f.accent;c.strokeRect(p.x-ts*.4,p.y-ts*.4,ts*.8,ts*.8);}
      if(o.type==='shrine'){c.fillStyle=o.used?'#304857':'#476b88';c.beginPath();c.ellipse(p.x,p.y+3,ts*.34,ts*.21,0,0,7);c.fill();c.strokeStyle='#8fbada';c.lineWidth=3;c.stroke();c.fillStyle=o.used?'#335261':'#94dbea';c.beginPath();c.ellipse(p.x,p.y,ts*.23,ts*.1,0,0,7);c.fill();if(!o.used&&visible)this.glow(p.x,p.y,ts*1.1,'#70bcf433');}
      if(o.type==='beacon'){this.glow(p.x,p.y,ts*2,'#edbe6b35');this.sprite(15,p.x,p.y-8,ts*1.45,visible?1:.3);}
      if(o.type==='trap'){c.strokeStyle='#d0a787';c.lineWidth=2;for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(p.x-8+k*6,p.y+6);c.lineTo(p.x-5+k*6,p.y-4);c.lineTo(p.x-1+k*6,p.y+6);c.stroke();}}
      c.globalAlpha=1;
    }
    const actors=[...s.enemies.filter(e=>e.hp>0&&s.visible[key(e.x,e.y)]),{...s.hero,type:'hero',id:0}].sort((a,b)=>a.y-b.y||a.x-b.x);
    for(const e of actors){const p=this.screen(e.x,e.y),hero=e.type==='hero',boss=e.type==='boss';const bob=this.reduced?0:Math.sin(time/(e.type==='bat'?130:450)+e.id)*1.5;
      if(hero){this.glow(p.x,p.y,ts*3.5,'#f4c36817');c.strokeStyle='#e8c680b0';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y+ts*.27,ts*.33,ts*.13,0,0,7);c.stroke();}
      c.fillStyle='#00000055';c.beginPath();c.ellipse(p.x,p.y+ts*.24,ts*(boss?.5:.3),ts*.12,0,0,7);c.fill();
      this.sprite(hero?0:ENEMIES[e.type].sprite,p.x,p.y-ts*(boss?.29:.16)+bob,ts*(boss?1.9:1.26));
      if(!hero){if(e.hp<e.maxHp||e.intent){c.fillStyle='#0c111bec';c.fillRect(p.x-ts*.36,p.y-ts*.67,ts*.72,5);c.fillStyle=e.intent?'#f1af79':'#bd777e';c.fillRect(p.x-ts*.36,p.y-ts*.67,ts*.72*e.hp/e.maxHp,4);}
        if(e.intent){c.fillStyle='#ffca94';c.font='bold 16px system-ui';c.textAlign='center';c.fillText('!',p.x,p.y-ts*.78);}
      }
      if(e.statuses.stun){c.strokeStyle='#98dce5';c.lineWidth=2;c.strokeRect(p.x-ts*.3,p.y-ts*.42,ts*.6,ts*.64);}
      if(e.statuses.burn||e.statuses.poison){c.fillStyle=e.statuses.burn?'#ffae75':'#afd87a';c.beginPath();c.arc(p.x+ts*.33,p.y-ts*.35,3,0,7);c.fill();}
    }
    // Dim the edges without obscuring the tile the player is choosing.
    const vignette=c.createRadialGradient(this.width/2,this.height/2,Math.min(this.width,this.height)*.2,this.width/2,this.height/2,Math.max(this.width,this.height)*.7);vignette.addColorStop(0,'#070d1700');vignette.addColorStop(1,'#070d1788');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);
    if(!this.reduced)for(let i=0;i<14;i++){const px=(noise(i,3)*this.width+Math.sin(time/3000+i)*12),py=(noise(i,9)*this.height-time*.005*(i%3+1)+this.height*10)%this.height;c.fillStyle=i%3?'#9cd2cf33':'#f2d38b55';c.fillRect(px,py,i%2+1,i%2+1);}
    this.fx=this.fx.filter(e=>time-e.start<950);for(const e of this.fx){const age=(time-e.start)/950,p=this.screen(e.x,e.y);c.globalAlpha=1-age;if(e.type==='hit'||e.type==='damage'){c.strokeStyle=e.color;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,ts*.2+age*ts*.6,0,7);c.stroke();}if(e.text){c.textAlign='center';c.font=`bold ${e.type==='level'?18:13}px system-ui`;c.lineWidth=4;c.strokeStyle='#101823';c.strokeText(e.text,p.x,p.y-ts*.65-age*24);c.fillStyle=e.color||'#e1ccb0';c.fillText(e.text,p.x,p.y-ts*.65-age*24);}c.globalAlpha=1;}
  }
  glow(x,y,r,color){const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
}
