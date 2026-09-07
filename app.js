const SIZE = 10;
const STORAGE_KEY = 'echecs-troll-v1';
const board = document.querySelector('#board');
const statusEl = document.querySelector('#status');
const counterEl = document.querySelector('#counter');
const hintEl = document.querySelector('#hint');
let mode = 'inspect';
let history = [];

function freshState() {
  const candidates = [];
  for (let row = 3; row <= 6; row++) {
    for (let col = 1; col <= 8; col++) candidates.push(`${row}-${col}`);
  }
  candidates.sort(() => Math.random() - 0.5);
  return { slippery: candidates.slice(0, 4), revealed: [], checked: [], gifts: [], bishops: {}, mirrored: false };
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || freshState(); }
  catch { return freshState(); }
}
let state = loadState();

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function snapshot() { history.push(JSON.stringify(state)); if (history.length > 30) history.shift(); }
function isOutside(row, col) { return row === 0 || col === 0 || row === 9 || col === 9; }
function coord(row, col) { return `${String.fromCharCode(96 + col)}${9 - row}`; }

function render() {
  board.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const key = `${row}-${col}`;
      const outside = isOutside(row, col);
      const cell = document.createElement('button');
      cell.className = `cell ${outside ? 'out' : ((row + col) % 2 ? 'dark' : 'light')}`;
      cell.dataset.key = key;
      cell.setAttribute('aria-label', outside ? 'Zone extérieure' : `Case ${coord(row, col)}`);
      if (state.revealed.includes(key)) cell.classList.add('slip');
      else if (state.checked.includes(key)) cell.classList.add('no-slip');
      if (state.gifts.includes(key)) cell.classList.add('gift');
      if (state.bishops[key]) cell.textContent = state.bishops[key] === 'white' ? '♗' : '♝';
      if (!outside && col === 1) {
        const label = document.createElement('small'); label.className = 'coord'; label.textContent = 9 - row; cell.append(label);
      }
      if (!outside && row === 8) {
        const label = document.createElement('small'); label.className = 'coord'; label.textContent = String.fromCharCode(96 + col); cell.append(label);
      }
      cell.addEventListener('click', () => act(key, outside));
      cell.addEventListener('contextmenu', e => { e.preventDefault(); setMode('gift'); act(key, outside); });
      board.append(cell);
    }
  }
  counterEl.textContent = `${state.revealed.length}/4 cases révélées`;
  save();
}

function act(key, outside) {
  snapshot();
  if (mode === 'inspect') {
    if (outside) return announce('Les cases glissantes sont uniquement sur le plateau.');
    if (state.slippery.includes(key)) {
      if (!state.revealed.includes(key)) state.revealed.push(key);
      announce('Ça glisse ! Couchez la pièce sur votre échiquier.');
    } else {
      if (!state.checked.includes(key)) state.checked.push(key);
      announce('Cette case n’est pas glissante.');
    }
  } else if (mode === 'gift') {
    toggleInList(state.gifts, key);
    announce(state.gifts.includes(key) ? 'Mine posée.' : 'Mine retirée.');
  } else {
    if (!outside) return announce('Les fous extérieurs se placent dans la bordure sombre.');
    const color = mode === 'white-bishop' ? 'white' : 'black';
    state.bishops[key] = state.bishops[key] === color ? undefined : color;
    if (!state.bishops[key]) delete state.bishops[key];
    announce(state.bishops[key] ? 'Fou placé hors du plateau.' : 'Fou retiré.');
  }
  render();
}

function toggleInList(list, key) {
  const index = list.indexOf(key);
  if (index >= 0) list.splice(index, 1); else list.push(key);
}
function announce(message) { statusEl.textContent = message; hintEl.textContent = message; }
function setMode(next) {
  mode = next;
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const hints = { inspect: 'Touchez la case d’arrivée pour vérifier si elle glisse.', gift: 'Touchez une case pour poser ou retirer une mine.', 'white-bishop': 'Touchez la bordure sombre pour placer un fou blanc.', 'black-bishop': 'Touchez la bordure sombre pour placer un fou noir.' };
  hintEl.textContent = hints[mode];
}

document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.querySelector('#mirrorBtn').addEventListener('click', () => {
  snapshot();
  const flip = key => { const [r, c] = key.split('-').map(Number); return `${r}-${9-c}`; };
  state.slippery = state.slippery.map(flip); state.revealed = state.revealed.map(flip);
  state.checked = state.checked.map(flip); state.gifts = state.gifts.map(flip);
  state.bishops = Object.fromEntries(Object.entries(state.bishops).map(([k,v]) => [flip(k),v]));
  state.mirrored = !state.mirrored; announce('Le monde s’est retourné… horizontalement.'); render();
});
document.querySelector('#undoBtn').addEventListener('click', () => {
  if (!history.length) return announce('Rien à annuler.');
  state = JSON.parse(history.pop()); announce('Dernière action annulée.'); render();
});
document.querySelector('#newBtn').addEventListener('click', () => {
  if (!confirm('Commencer une nouvelle partie et tirer quatre nouvelles cases glissantes ?')) return;
  history = []; state = freshState(); announce('Nouvelle partie : quatre cases ont été tirées en secret.'); render();
});
const dialog = document.querySelector('#rulesDialog');
document.querySelector('#rulesBtn').addEventListener('click', () => dialog.showModal());
document.querySelector('#closeRules').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
render();
