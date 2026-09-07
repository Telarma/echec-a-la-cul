'use strict';
const E=Troll, $=id=>document.getElementById(id), STORAGE='troll-chess-full-v2';
let state=E.fresh(),selected=null,history=[],margin=1;
try {const old=JSON.parse(localStorage.getItem(STORAGE));if(old?.version===2&&Array.isArray(old.pieces)&&Array.isArray(old.ice))state=old;}catch{}
const symbols={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',c:'♜'};
const colorName=c=>c==='w'?'Blancs':c==='b'?'Noirs':'Neutre';
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));$('saveStatus').textContent='Sauvegarde automatique sur cet appareil.';}catch{$('saveStatus').textContent='Sauvegarde indisponible : gardez cette page ouverte.';}}
function message(t){$('status').textContent=t;}
function transact(fn){const before=E.copy(state);try{const msg=fn();history.push(before);if(history.length>50)history.shift();selected=null;render();if(msg)message(msg);}catch(err){state=before;message(err.message);}}
function render(){
 const over=state.winner,terminal=state.pending?.result;
 $('turn').textContent=over?colorName(over)+' : victoire !':terminal?'Fin de partie à confirmer':'Aux '+colorName(state.turn).toLowerCase()+(state.revenge?' — vengeance libre':'');
 $('counter').textContent=state.revealed.length+'/4 glaces · '+state.ply+' coups';
 $('lastMove').textContent=state.pending?.text||'Aucun coup contestable.';
 $('accuseBtn').disabled=!!over||!state.pending||state.pending.authorized;
 $('acceptBtn').disabled=!!over||!state.pending;
 $('undoBtn').disabled=!history.length;
 const p=selected&&!selected.mine?state.pieces.find(p=>p.id===selected.id):null;
 $('wakeBtn').disabled=!!over||!!terminal||!p?.sleep||p.color!==state.turn;
 $('selection').textContent=selected?(selected.mine?'Mine':E.names[p?.type]||'Pièce')+' sélectionnée : choisissez la destination.':'Cliquez une pièce, puis sa destination. Aucun coup illégal n’est signalé automatiquement.';
 $('score').textContent='Pions élevés : Blancs '+state.ascended.w+'/8 · Noirs '+state.ascended.b+'/8';
 const coordinates=[...state.pieces,...state.mines.map(k=>{let [x,y]=k.split(',').map(Number);return {x,y};})];
 const minX=Math.min(-margin,...coordinates.map(p=>p.x-1)),maxX=Math.max(7+margin,...coordinates.map(p=>p.x+1));
 const minY=Math.min(-margin,...coordinates.map(p=>p.y-1)),maxY=Math.max(7+margin,...coordinates.map(p=>p.y+1));
 const width=maxX-minX+1;const board=$('board');board.replaceChildren();
 board.style.gridTemplateColumns='repeat('+width+',1fr)';board.style.aspectRatio=width+'/'+(maxY-minY+1);board.style.minWidth=width*38+'px';
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const k=E.key(x,y),piece=E.at(state,x,y),mine=state.mines.includes(k),cell=document.createElement('button');
  cell.className='cell '+(E.inside(x,y)?(x+y)%2?'dark':'light':'out');
  if(state.revealed.includes(k))cell.classList.add('slip');
  if(selected&&(selected.mine?selected.x===x&&selected.y===y:piece?.id===selected.id))cell.classList.add('selected');
  if(piece){let glyph=document.createElement('span');glyph.className='piece '+piece.color+(piece.sleep?' asleep':'');glyph.textContent=symbols[piece.type];cell.append(glyph);if(piece.type==='c'){let tag=document.createElement('span');tag.className='castle-tag';tag.textContent='C';cell.append(tag);}}
  if(mine){let token=document.createElement('span');token.className='mine';token.textContent='✦';cell.append(token);}
  const label=document.createElement('span');label.className='coord';label.textContent=E.label(x,y);cell.append(label);
  cell.setAttribute('aria-label',E.label(x,y)+(piece?', '+E.names[piece.type]+' '+colorName(piece.color)+(piece.sleep?', couché':''):'')+(mine?', mine':'')+(state.revealed.includes(k)?', glace':''));
  cell.addEventListener('click',()=>click(x,y));board.append(cell);
 }
 $('log').replaceChildren();for(const text of state.logs){const li=document.createElement('li');li.textContent=text;$('log').append(li);}save();
 if(over)message('Partie terminée : victoire des '+colorName(over).toLowerCase()+'.');
 else if(terminal)message('Le roi est tombé. Acceptez le coup ou accusez avant de conclure.');
}
function click(x,y){
 if(state.winner||state.pending?.result)return message('Acceptez ou contestez le dernier coup, ou commencez une nouvelle partie.');
 if(selected){const p=selected.mine?selected:state.pieces.find(p=>p.id===selected.id);if(p.x===x&&p.y===y){selected=null;render();return;}
  transact(()=>{E.move(state,selected,x,y);return state.pending?.result?'Le roi est tombé : acceptez ou contestez le dernier coup.':'Coup joué. Aux '+colorName(state.turn).toLowerCase()+' : accusez ou jouez.';});return;
 }
 const p=E.at(state,x,y);if(p)selected={id:p.id};else if(state.mines.includes(E.key(x,y)))selected={mine:true,x,y};else return message('Sélectionnez d’abord une pièce ou une mine.');render();
}
for(const [key,text] of Object.entries(E.rules)){const option=document.createElement('option');option.value=key;option.textContent=text;$('ruleSelect').append(option);}
$('rulesBtn').onclick=()=>$('rulesDialog').showModal();
$('accuseBtn').onclick=()=>$('accuseDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('confirmAccuse').onclick=()=>{transact(()=>E.accuse(state,$('ruleSelect').value)?'Accusation correcte. À vous de jouer votre vengeance.':'Fausse accusation : tour perdu, vengeance à l’adversaire.');$('accuseDialog').close();};
$('acceptBtn').onclick=()=>transact(()=>{E.accept(state);return state.winner?'Victoire des '+colorName(state.winner).toLowerCase()+' !':'Coup accepté. À vous de jouer.';});
$('wakeBtn').onclick=()=>transact(()=>{E.wake(state,selected?.id);return 'Pièce relevée. Le tour passe à l’adversaire.';});
$('cancelBtn').onclick=()=>{selected=null;render();};
$('expandBtn').onclick=()=>{margin++;render();message('Zone extérieure agrandie. Faites défiler le plateau si nécessaire.');};
$('undoBtn').onclick=()=>{if(history.length&&confirm('Les deux joueurs sont-ils d’accord pour annuler ?')){state=history.pop();selected=null;render();message('Dernière action annulée.');}};
$('newBtn').onclick=()=>{if(confirm('Recommencer avec 32 pièces et quatre nouvelles cases glissantes ?')){history.push(E.copy(state));state=E.fresh();selected=null;margin=1;render();message('Nouvelle partie : aux Blancs.');}};
render();
