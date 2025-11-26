// --- DOM REFERENCES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const selectAlgo = document.getElementById('algoSelect');
const logContent = document.getElementById('log-content');

// UI Groups
const controlsLab = document.getElementById('controls-lab');
const controlsQuest = document.getElementById('controls-quest');
const contentLab = document.getElementById('content-lab');
const contentQuest = document.getElementById('content-quest');
const modeSwitch = document.getElementById('modeSwitch');

// Buttons
const btnBatch = document.getElementById('btnBatch');
const btnAddSingle = document.getElementById('btnAddSingle');
const btnCollision = document.getElementById('btnCollision');
const btnUndo = document.getElementById('btnUndo');
const btnReport = document.getElementById('btnReport');
const btnClear = document.getElementById('btnClear');
const btnNewQuest = document.getElementById('btnNewQuest');
const btnTestQuest = document.getElementById('btnTestQuest');
const btnStartIntro = document.getElementById('btnStartIntro');
const btnHelp = document.getElementById('btnHelp');
const btnCloseReport = document.getElementById('btnCloseReport');

// Modals
const introModal = document.getElementById('intro-modal');
const reportModal = document.getElementById('report-modal');

// Report UI
const repAlgo = document.getElementById('rep-algo');
const repItems = document.getElementById('rep-items');
const repCol = document.getElementById('rep-col');
const repScore = document.getElementById('rep-score');
const repDesc = document.getElementById('rep-desc');

// Stats UI
const uiSize = document.getElementById('statSize');
const uiItems = document.getElementById('statItems');
const uiLoad = document.getElementById('statLoad');
const uiBar = document.getElementById('loadBar');

// Quest UI
const questText = document.getElementById('questText');
const questOptionsContainer = document.getElementById('quest-options-container');
const activeQuestBox = document.getElementById('active-quest-box');
const noQuestMsg = document.getElementById('no-quest-msg');
const questFeedback = document.getElementById('questFeedback');
const coinVal = document.getElementById('coinVal');


// --- GLOBAL STATE ---
let CURRENT_MODE = 'SANDBOX'; 
let TABLE_SIZE = 10;
let SLOT_W = 64;       
let GRID_COLS = 10;    
let currentSlotGap = 15;
let SHELF_START_Y = 100;
const SCANNER_POS = { x: canvas.width / 2, y: 580 };

let GAME_MODE = null; 
const MAX_LOAD_FACTOR = 0.7; 

let savedBatch = []; 
let sessionCollisions = 0; 
let sessionItemsProcessed = 0; 
let coins = 0;
let currentQuestData = null;

// --- LISTENERS ---
if(btnStartIntro) btnStartIntro.addEventListener('click', () => introModal.classList.add('hidden'));
if(btnHelp) btnHelp.addEventListener('click', () => introModal.classList.remove('hidden'));
if(btnCloseReport) btnCloseReport.addEventListener('click', () => reportModal.classList.add('hidden'));

modeSwitch.addEventListener('click', toggleMode);

btnBatch.addEventListener('click', () => addBatch(10));
btnAddSingle.addEventListener('click', addSingleRandomItem);
btnCollision.addEventListener('click', forceCollision);
btnUndo.addEventListener('click', undoLastItem);
btnReport.addEventListener('click', showReport);
btnClear.addEventListener('click', resetEverything);
selectAlgo.addEventListener('change', handleAlgoChange);

btnNewQuest.addEventListener('click', startRandomQuest);
btnTestQuest.addEventListener('click', testQuestHypothesis);

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for(let item of bag) {
        if(item.state === 'WAITING' && Math.hypot(mx - item.x, my - item.y) < 30) {
            shelf.startProcess(item); break;
        }
    }
});

// --- MODE SWITCH ---
function toggleMode() {
    if (CURRENT_MODE === 'SANDBOX') {
        CURRENT_MODE = 'QUEST';
        modeSwitch.classList.remove('sandbox'); modeSwitch.classList.add('quest');
        controlsLab.classList.add('hidden'); contentLab.classList.add('hidden');
        controlsQuest.classList.remove('hidden'); contentQuest.classList.remove('hidden');
        resetEverything(true);
    } else {
        CURRENT_MODE = 'SANDBOX';
        modeSwitch.classList.remove('quest'); modeSwitch.classList.add('sandbox');
        controlsQuest.classList.add('hidden'); contentQuest.classList.add('hidden');
        controlsLab.classList.remove('hidden'); contentLab.classList.remove('hidden');
        resetEverything(true);
    }
}

// --- QUEST SYSTEM ---
const QUESTS = [
    {
        text: "Se usarmos <strong>Sondagem Linear</strong> numa tabela de tamanho 10, onde o item <strong>25</strong> vai cair se o slot 5 já estiver ocupado?",
        setup: () => {
            TABLE_SIZE = 10; GAME_MODE = 'LINEAR'; selectAlgo.value = 'LINEAR';
            bag.push(new Item(15, 'potion', 100, 640));
            shelf.startProcess(bag[0]);
        },
        testItem: { id: 25, type: 'sword' },
        correct: 6, // 25%10=5 -> 5+1=6
        options: [5, 6, 7, 2]
    },
    {
        text: "No <strong>Hash Duplo</strong> (H2 = 7 - k%7), onde o item <strong>12</strong> cairá se o slot 2 estiver cheio? (Tamanho 10)",
        setup: () => {
            TABLE_SIZE = 10; GAME_MODE = 'DOUBLE'; selectAlgo.value = 'DOUBLE';
            bag.push(new Item(22, 'potion', 100, 640)); // Ocupa 2
            shelf.startProcess(bag[0]);
        },
        testItem: { id: 12, type: 'sword' },
        correct: 4, // 12%10=2. H2=7-(12%7)=2. Salto: 2+2=4.
        options: [2, 3, 4, 9]
    }
];

function startRandomQuest() {
    resetEverything(false);
    currentQuestData = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    
    noQuestMsg.classList.add('hidden');
    activeQuestBox.classList.remove('hidden');
    questFeedback.classList.add('hidden');
    questText.innerHTML = currentQuestData.text;
    btnTestQuest.disabled = false;
    
    questOptionsContainer.innerHTML = '';
    const opts = [...currentQuestData.options].sort(() => Math.random() - 0.5);
    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-btn';
        btn.innerText = `👉 Slot ${opt}`;
        btn.onclick = () => checkAnswer(opt, btn);
        questOptionsContainer.appendChild(btn);
    });
    currentQuestData.setup();
}

function testQuestHypothesis() {
    if (!currentQuestData) return;
    const t = currentQuestData.testItem;
    bag.push(new Item(t.id, t.type, 450, 640));
    btnTestQuest.disabled = true;
}

function checkAnswer(selected, btnElement) {
    const isCorrect = selected === currentQuestData.correct;
    questFeedback.classList.remove('hidden');
    
    if (isCorrect) {
        coins += 50; coinVal.innerText = coins;
        questFeedback.innerHTML = "✅ RESPOSTA CORRETA! +50";
        questFeedback.className = "feedback-box correct";
        Array.from(questOptionsContainer.children).forEach(b => b.disabled = true);
    } else {
        questFeedback.innerHTML = "❌ ERROU! Teste na mesa para ver.";
        questFeedback.className = "feedback-box wrong";
        btnElement.disabled = true;
    }
}

// --- SANDBOX LOGIC ---
function enableControls() {
    btnBatch.disabled = false; btnAddSingle.disabled = false; btnUndo.disabled = false; btnReport.disabled = false; btnCollision.disabled = false;
    logContent.innerHTML = '<div style="color:#555;text-align:center;margin-top:20px;">Laboratório Ativo.</div>';
}

function addBatch(count) {
    if (!GAME_MODE) return;
    const newItems = [];
    for(let i=0; i<count; i++) {
        const id = Math.floor(Math.random() * 1000);
        const type = Math.random() > 0.6 ? 'sword' : 'potion';
        newItems.push({id, type}); savedBatch.push({id, type});
    }
    sessionItemsProcessed += count; spawnItems(newItems);
    addLogHeader(`🎲 LOTE ADCIONADO (+${count})`);
}

function addSingleRandomItem() {
    if (!GAME_MODE) return;
    const id = Math.floor(Math.random() * 1000);
    const type = Math.random() > 0.6 ? 'sword' : 'potion';
    savedBatch.push({id, type}); spawnItems([{id, type}]);
    sessionItemsProcessed++;
}

function forceCollision() {
    if (!GAME_MODE) return;
    let occupied = [];
    for(let i=0; i<TABLE_SIZE; i++) { if(shelf.slots[i].length > 0) occupied.push(i); }
    if(occupied.length===0) return alert("Mesa vazia!");
    const target = occupied[Math.floor(Math.random()*occupied.length)];
    const newID = (Math.floor(Math.random()*50)+1)*TABLE_SIZE + target;
    savedBatch.push({id:newID, type:'sword'}); spawnItems([{id:newID, type:'sword'}]);
    sessionItemsProcessed++;
    addLogHeader(`💥 COLISÃO FORÇADA (Alvo: ${target})`);
}

function spawnItems(itemsData) {
    itemsData.forEach(data => {
        const startX = 100 + Math.random() * 700;
        const startY = 640 + Math.random() * 50; 
        bag.push(new Item(data.id, data.type, startX, startY));
    });
}

function showReport() {
    repAlgo.innerText = GAME_MODE; repItems.innerText = sessionItemsProcessed; repCol.innerText = sessionCollisions;
    const r = sessionItemsProcessed > 0 ? (sessionCollisions/sessionItemsProcessed) : 0;
    repScore.innerText = r < 0.5 ? "EXCELENTE" : (r < 1 ? "REGULAR" : "BAIXA");
    repScore.style.color = r < 0.5 ? "#4caf50" : (r < 1 ? "#ffca28" : "#ff5252");
    repDesc.innerText = `Média: ${r.toFixed(2)} colisões/item`;
    reportModal.classList.remove('hidden');
}

function resetEverything(fullReset = false) {
    bag = []; savedBatch = []; TABLE_SIZE = 10; clearLog();
    shelf = new MagicShelf(); sessionCollisions = 0; sessionItemsProcessed = 0; 
    updateStats();
    if (fullReset) {
        activeQuestBox.classList.add('hidden');
        noQuestMsg.classList.remove('hidden');
    }
}

function handleAlgoChange() {
    GAME_MODE = selectAlgo.value;
    if (CURRENT_MODE === 'SANDBOX') {
        enableControls();
        bag = []; TABLE_SIZE = 10; shelf = new MagicShelf(); clearLog();
        sessionCollisions = 0; sessionItemsProcessed = 0; 
        updateStats();
        if (savedBatch.length > 0) {
            addLogHeader(`🔁 REPLAY AUTOMÁTICO (${GAME_MODE})`);
            sessionItemsProcessed = savedBatch.length;
            spawnItems(savedBatch);
        }
    }
}

function addLogHeader(text) {
    const div = document.createElement('div');
    div.style.padding = "8px"; div.style.borderBottom = "1px solid #333";
    div.style.color = "#aaa"; div.style.textAlign = "center"; div.style.fontSize = "11px";
    div.innerText = text; logContent.prepend(div);
}

function addLogEntry(item, slot, col, formula, detail) {
    const div = document.createElement('div');
    div.className = 'log-entry'; div.id = `log-item-${item.id}`;
    if(col>0) div.classList.add('collision');
    div.innerHTML = `<span class="log-id">ID: ${item.id}</span><br><span class="log-base">Destino: ${formula}</span>` +
                    (col > 0 ? `<br><span class="log-error">⚠️ ${col} Colisões</span><span class="log-calc">${detail}</span>` : '') +
                    `<br><span class="log-final">➔ Slot ${slot}</span>`;
    logContent.prepend(div);
}

function removeLogByItemId(id) {
    const el = document.getElementById(`log-item-${id}`);
    if(el) el.remove();
}

function updateStats() {
    uiSize.innerText = TABLE_SIZE; uiItems.innerText = shelf.itemsCount;
    uiLoad.innerText = (shelf.itemsCount/TABLE_SIZE).toFixed(2);
    uiBar.style.width = Math.min((shelf.itemsCount/TABLE_SIZE)*100, 100) + "%";
    uiBar.style.backgroundColor = (shelf.itemsCount/TABLE_SIZE) > 0.7 ? "#ff5252" : "#4fc3f7";
}

function updateLayoutMetrics() {
    if (TABLE_SIZE <= 10) { SLOT_W = 64; currentSlotGap = 15; GRID_COLS = 5; } 
    else { SLOT_W = 32; currentSlotGap = 5; GRID_COLS = 10; }
    if (GAME_MODE === 'CHAINING') {
        GRID_COLS = TABLE_SIZE; 
        const availableWidth = canvas.width - 60;
        SLOT_W = Math.min(64, Math.max(20, (availableWidth / TABLE_SIZE) - 5));
        currentSlotGap = 5;
    }
}

function getSlotScreenPos(index) {
    updateLayoutMetrics();
    const col = index % GRID_COLS; const row = Math.floor(index / GRID_COLS);
    const totalW = GRID_COLS * SLOT_W + (GRID_COLS-1)*currentSlotGap;
    const startX = (canvas.width - totalW) / 2;
    const x = startX + col * (SLOT_W + currentSlotGap);
    const y = SHELF_START_Y + row * (SLOT_W + currentSlotGap + 15);
    return {x: x + SLOT_W/2, y: y + SLOT_W/2, size: SLOT_W};
}

// --- CLASS LOGIC ---
class MagicShelf {
    constructor() { this.resetSlots(); this.itemsCount = 0; this.isResizing = false; this.history = []; }
    resetSlots() { this.slots = Array.from({length: TABLE_SIZE}, () => []); }
    
    checkResize() {
        if(this.isResizing || this.itemsCount/TABLE_SIZE < MAX_LOAD_FACTOR) return;
        this.isResizing = true;
        alert(`⚠️ LIMITE DE CARGA! Tabela dobrará.`);
        setTimeout(() => {
            addLogHeader(`⚡ EXPANSÃO: ${TABLE_SIZE} ➔ ${TABLE_SIZE*2}`);
            TABLE_SIZE *= 2; this.itemsCount = 0; this.history = []; this.resetSlots();
            bag.forEach(i => { if(i.state==='STORED') { i.state='WAITING'; i.targetX=i.x; i.targetY=50; setTimeout(()=>this.startProcess(i), Math.random()*1000); }});
            updateStats(); this.isResizing = false;
        }, 500);
    }
    
    startProcess(item) { if(!this.isResizing) { item.state='TO_SCANNER'; item.targetX=SCANNER_POS.x; item.targetY=SCANNER_POS.y; } }
    
    undoLast() {
        if(this.history.length === 0) return alert("Nada para desfazer!");
        const item = this.history.pop();
        const bucket = this.slots[item.finalSlotIndex];
        if(bucket) { const idx = bucket.indexOf(item); if(idx > -1) bucket.splice(idx, 1); }
        
        item.state = 'WAITING'; item.finalSlotIndex = -1; item.pathQueue = [];
        item.x = item.targetX = 100 + Math.random()*700; item.y = item.targetY = 640;
        
        const sIdx = savedBatch.findIndex(d => d.id === item.id);
        if(sIdx > -1) savedBatch.splice(sIdx, 1);

        this.itemsCount--; sessionItemsProcessed--; sessionCollisions -= item.collidedThisTurn; item.collidedThisTurn = 0;
        updateStats(); removeLogByItemId(item.id);
    }

    calculatePath(item) {
        const start = item.id % TABLE_SIZE;
        item.state = 'MOVING_PATH'; item.pathQueue = [];
        let curr = start, i = 0, found = false;
        let cols = 0, detail = "";
        const h2 = (GAME_MODE === 'DOUBLE') ? (7 - (item.id % 7)) : 1;

        if (GAME_MODE === 'CHAINING') {
            this.slots[start].push(item);
            const pos = getSlotScreenPos(start);
            const depth = this.slots[start].length - 1;
            item.pathQueue.push({x: pos.x, y: pos.y + 10 + (depth*pos.size), action: 'STORE'});
            item.finalSlotIndex = start;
            if(depth > 0) { cols = depth; detail = `Lista (${depth})`; }
        } else {
            while(i < TABLE_SIZE*2) {
                if(GAME_MODE==='LINEAR') curr = (start + i) % TABLE_SIZE;
                else if(GAME_MODE==='QUADRATIC') curr = (start + i*i) % TABLE_SIZE;
                else if(GAME_MODE==='DOUBLE') curr = (start + i*h2) % TABLE_SIZE;
                
                const pos = getSlotScreenPos(curr);
                item.pathQueue.push({x: pos.x, y: pos.y, action: 'CHECK'});
                
                if(this.slots[curr].length === 0) {
                    this.slots[curr].push(item);
                    item.pathQueue.push({x: pos.x, y: pos.y, action: 'STORE'});
                    found = true; item.finalSlotIndex = curr;
                    if(i > 0) {
                        if(GAME_MODE==='LINEAR') detail = `(${start}+${i})%${TABLE_SIZE}`;
                        else if(GAME_MODE==='QUADRATIC') detail = `(${start}+${i}²)%${TABLE_SIZE}`;
                        else detail = `(${start}+${i}*${h2})%${TABLE_SIZE}`;
                    }
                    break;
                }
                item.pathQueue.push({x: pos.x, y: pos.y-20, action: 'COLLISION'});
                i++; cols++;
            }
            if(!found) { item.state='WAITING'; item.targetY=650; return; }
        }
        item.collidedThisTurn = cols;
        sessionCollisions += cols;
        if(CURRENT_MODE === 'SANDBOX') addLogEntry(item, item.finalSlotIndex, cols, `${item.id}%${TABLE_SIZE}`, detail);
        if(item.pathQueue.length > 0) { const f = item.pathQueue.shift(); item.targetX=f.x; item.targetY=f.y; }
    }

    draw() {
        updateLayoutMetrics();
        for(let i=0; i<TABLE_SIZE; i++) {
            const pos = getSlotScreenPos(i);
            const s = pos.size;
            ctx.fillStyle = "#261612"; ctx.fillRect(pos.x-s/2, pos.y-s/2, s, s);
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2; ctx.strokeRect(pos.x-s/2, pos.y-s/2, s, s);
            
            if(s > 25) { ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.font = `${Math.floor(s/2)}px Arial`; ctx.fillText(i, pos.x, pos.y+s/3); }
            
            if(GAME_MODE === 'CHAINING') {
                const b = this.slots[i];
                if(b.length > 1) {
                     for(let j=1; j<b.length; j++) {
                         const prevY = (j===1) ? pos.y : b[j-1].y;
                         ctx.strokeStyle = "#00bcd4"; ctx.beginPath(); ctx.moveTo(b[j].x, b[j].y); ctx.lineTo(b[j].x, prevY+s/2); ctx.stroke();
                     }
                }
            }
        }
    }
}

function undoLastItem() { shelf.undoLast(); }

let shelf = new MagicShelf();

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Art.drawScanner(SCANNER_POS.x, SCANNER_POS.y, bag.some(i => i.state === 'SCANNING'));
    shelf.draw();
    bag.forEach(i => { i.update(); i.draw(); });
    requestAnimationFrame(loop);
}
updateLayoutMetrics(); // Force init
loop();