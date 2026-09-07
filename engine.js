(function(root){
'use strict';
const copy = v => JSON.parse(JSON.stringify(v));
const key = (x,y) => `${x},${y}`;
const inside = (x,y) => x>=0 && x<8 && y>=0 && y<8;
const other = c => c==='w'?'b':'w';
const names={p:'Pion',r:'Tour',n:'Cavalier',b:'Fou',q:'Dame',k:'Roi',c:'Château'};
const rules={owner:'2 — Déplacer une pièce adverse (sauf sa dame)',pawn:'4/6 — Pion : une case orthogonale',knight:'7 — Cavalier : déplacement en L',jump:'9 — Sauter par-dessus une pièce',king:'12 — Roi : une seule case',bishop:'13 — Fou : diagonales',rook:'14 — Tour : lignes et colonnes',queen:'18 — Dame : lignes, colonnes ou diagonales',friend:'23/24 — Capturer une pièce amie sans tour',outside:'25 — Sortir du plateau sans être un fou',mine:'26 — Déplacer une mine',sleep:'27 — Déplacer une pièce couchée',castle:'28 — Déplacer un château',affair:'29 — Dame capturant le roi adverse'};
function fresh(random=Math.random){
 let s={version:2,pieces:[],mines:[],ice:[],revealed:[],turn:'w',revenge:false,pending:null,winner:null,logs:[],ascended:{w:0,b:0},ply:0};
 const order=['r','n','b','q','k','b','n','r'];let id=0;
 for(const color of ['b','w'])for(let x=0;x<8;x++){
  s.pieces.push({id:++id,type:order[x],color,x,y:color==='b'?0:7,sleep:false});
  s.pieces.push({id:++id,type:'p',color,x,y:color==='b'?1:6,sleep:false});
 }
 const candidates=[];for(let y=2;y<=5;y++)for(let x=0;x<8;x++)candidates.push(key(x,y));
 for(let i=candidates.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 s.ice=candidates.slice(0,4);return s;
}
const at=(s,x,y)=>s.pieces.find(p=>p.x===x&&p.y===y);
function violations(s,p,x,y){
 const v=[];const dx=Math.abs(x-p.x),dy=Math.abs(y-p.y);const target=at(s,x,y);
 if(p.type==='mine')return ['mine'];
 if(p.color!==s.turn && p.type!=='q')v.push('owner');
 if(p.sleep)v.push('sleep');
 if(!inside(x,y)&&p.type!=='b')v.push('outside');
 if(target&&target.color===p.color&&p.type!=='r')v.push('friend');
 if(p.type==='p'&&dx+dy!==1)v.push('pawn');
 if(p.type==='n'&&!((dx===2&&dy===1)||(dx===1&&dy===2)))v.push('knight');
 if(p.type==='k'&&Math.max(dx,dy)!==1)v.push('king');
 if(p.type==='b'&&dx!==dy)v.push('bishop');
 if(p.type==='r'&&dx!==0&&dy!==0)v.push('rook');
 if(p.type==='q'&&dx!==0&&dy!==0&&dx!==dy)v.push('queen');
 if(p.type==='c')v.push('castle');
 if(p.type==='q'&&target?.type==='k'&&target.color!==p.color)v.push('affair');
 if(p.type!=='n'&&(dx===0||dy===0||dx===dy)){
  const sx=Math.sign(x-p.x),sy=Math.sign(y-p.y);for(let i=1;i<Math.max(dx,dy);i++)if(at(s,p.x+i*sx,p.y+i*sy)){v.push('jump');break;}
 }
 return [...new Set(v)];
}
function log(s,t){s.logs.unshift(t);s.logs=s.logs.slice(0,60);}
const label=(x,y)=>inside(x,y)?`${'abcdefgh'[x]}${8-y}`:`[${x},${y}]`;
function settle(s,random){
 if(!s.pieces.some(p=>p.type==='k'&&p.color==='w'))return 'b';
 if(!s.pieces.some(p=>p.type==='k'&&p.color==='b')){
  let candidates=s.pieces.filter(p=>p.color==='b');
  if(!candidates.length)return 'w';
  const next=candidates[Math.floor(random()*candidates.length)];next.type='k';
  log(s,`La couronne noire passe en ${label(next.x,next.y)}.`);
 }
 if(s.ascended.w===8)return 'w';
 return null;
}
function mirror(s){
 s.pieces.forEach(p=>p.x=7-p.x);
 for(const field of ['mines','ice','revealed'])s[field]=s[field].map(k=>{const [x,y]=k.split(',').map(Number);return key(7-x,y);});
}
function move(s,source,x,y,random=Math.random){
 if(s.winner||s.pending?.result)throw Error('Validez ou contestez la fin de partie.');
 const p=source.mine?{type:'mine',x:source.x,y:source.y}:s.pieces.find(p=>p.id===source.id);
 if(!p||!Number.isInteger(x)||!Number.isInteger(y)||(p.x===x&&p.y===y))throw Error('Choisissez une autre case.');
 if(source.mine&&!s.mines.includes(key(p.x,p.y)))throw Error('Mine absente.');
 const before=copy(s);before.pending=null;
 const faults=s.revenge?[]:violations(s,p,x,y);const authorized=s.revenge;const actor=s.turn;
 s.pending=null;
 const text=`${actor==='w'?'Blancs':'Noirs'} : ${names[p.type]||'Mine'} ${label(p.x,p.y)} → ${label(x,y)}${authorized?' (vengeance)':''}`;
 if(p.type==='mine'){
  s.mines=s.mines.filter(k=>k!==key(p.x,p.y));
  const target=at(s,x,y);
  if(target)s.pieces=s.pieces.filter(q=>q.id!==target.id);
  else if(!s.mines.includes(key(x,y)))s.mines.push(key(x,y));
 }else{
  const target=at(s,x,y);const captured=Boolean(target);const wasBishop=p.type==='b';const wasQueen=p.type==='q';
  if(wasBishop&&!s.mines.includes(key(p.x,p.y)))s.mines.push(key(p.x,p.y));
  if(target)s.pieces=s.pieces.filter(q=>q.id!==target.id);
  p.x=x;p.y=y;
  if(s.mines.includes(key(x,y))){s.mines=s.mines.filter(k=>k!==key(x,y));s.pieces=s.pieces.filter(q=>q.id!==p.id);log(s,'Explosion : la pièce et la mine disparaissent.');}
  else if(p.type==='p'&&inside(x,y)&&y===(p.color==='w'?0:7)){
   s.ascended[p.color]++;s.pieces=s.pieces.filter(q=>q.id!==p.id);log(s,'Un pion s’élève, sans promotion.');
  }else{
   if(s.ice.includes(key(x,y))){p.sleep=true;if(!s.revealed.includes(key(x,y)))s.revealed.push(key(x,y));log(s,'Une pièce glisse. La relever coûtera un tour.');}
   if(p.type==='r'){
    const neighbour=s.pieces.find(q=>q.id!==p.id&&q.type==='r'&&Math.abs(q.x-x)+Math.abs(q.y-y)===1);
    if(neighbour){s.pieces=s.pieces.filter(q=>q.id!==neighbour.id);p.type='c';p.color='neutral';log(s,'Deux tours fusionnent en château neutre.');}
   }
  }
  if(wasQueen&&captured){mirror(s);log(s,'Capture par une dame : miroir horizontal.');}
 }
 log(s,text);const result=settle(s,random);
 s.pending={actor,faults,authorized,text,result,before:result?before:null};
 s.turn=other(actor);s.revenge=false;s.ply++;return s;
}
function accuse(s,rule){
 if(s.winner||!s.pending||s.pending.authorized)throw Error('Aucun coup contestable.');
 const last=s.pending;const correct=last.faults.includes(rule);const challenger=s.turn;
 if(correct&&last.result){Object.assign(s,copy(last.before));s.turn=challenger;log(s,'Convention locale : capture terminale illégale annulée.');}
 if(correct){s.revenge=true;log(s,`Accusation correcte : ${rules[rule]}. Un coup de vengeance est accordé.`);}
 else {s.turn=last.actor;s.revenge=true;log(s,'Fausse accusation : tour perdu, vengeance à l’adversaire.');if(last.result)s.winner=last.result;}
 s.pending=null;return correct;
}
function accept(s){
 if(!s.pending)throw Error('Aucun coup à valider.');
 if(s.pending.result)s.winner=s.pending.result;
 s.pending=null;
}
function wake(s,id){
 if(s.winner||s.pending?.result)throw Error('La fin de partie attend confirmation.');
 let p=s.pieces.find(q=>q.id===id);if(!p?.sleep||p.color!==s.turn)throw Error('Sélectionnez une pièce couchée de votre couleur.');
 s.pending=null;p.sleep=false;s.turn=other(s.turn);s.revenge=false;s.ply++;log(s,'La pièce est relevée. Tour suivant.');
}
const api={fresh,at,violations,move,accuse,accept,wake,mirror,rules,names,key,inside,label,copy};
if(typeof module!=='undefined')module.exports=api;else root.Troll=api;
})(globalThis);
