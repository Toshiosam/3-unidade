// --- DOM ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const selectAlgo = document.getElementById('algoSelect');
const logContent = document.getElementById('log-content');

const uiSize = document.getElementById('statSize');
const uiItems = document.getElementById('statItems');
const uiLoad = document.getElementById('statLoad');
const uiBar = document.getElementById('loadBar');

const btnBatch = document.getElementById('btnBatch');
const btnAddSingle = document.getElementById('btnAddSingle');
const btnCollision = document.getElementById('btnCollision');
const btnUndo = document.getElementById('btnUndo');
const btnReport = document.getElementById('btnReport');
const btnClear = document.getElementById('btnClear');
const btnStartIntro = document.getElementById('btnStartIntro');
const btnHelp = document.getElementById('btnHelp');
const btnCloseReport = document.getElementById('btnCloseReport');

const introModal = document.getElementById('intro-modal');
const reportModal = document.getElementById('report-modal');
const repAlgo = document.getElementById('rep-algo');
const repItems = document.getElementById('rep-items');
const repCol = document.getElementById('rep-col');
const repScore = document.getElementById('rep-score');
const repDesc = document.getElementById('rep-desc');

let TABLE_SIZE = 10;
let SLOT_W = 64;       
let GRID_COLS = 10;    
let currentSlotGap = 15;
let SHELF_START_Y = 100;
const SCANNER_POS = { x: canvas.width / 2, y: 580 };

let GAME_MODE = null; 
const MAX_LOAD_FACTOR = 0.7; 

let savedBatch = []; 
let currentBatchProcessing = 0; 
let sessionCollisions = 0; 
let sessionItemsProcessed = 0; 

// LISTENERS
if(btnStartIntro) btnStartIntro.addEventListener('click', () => introModal.classList.add('hidden'));
if(btnHelp) btnHelp.addEventListener('click', () => introModal.classList.remove('hidden'));
if(btnCloseReport) btnCloseReport.addEventListener('click', () => reportModal.classList.add('hidden'));

btnBatch.addEventListener('click', () => addBatch(10));
btnAddSingle.addEventListener('click', addSingleRandomItem);
btnCollision.addEventListener('click', forceCollision);
btnUndo.addEventListener('click', undoLastItem);
btnReport.addEventListener('click', showReport);
btnClear.addEventListener('click', resetEverything);
selectAlgo.addEventListener('change', handleAlgoChange);

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

// LOGIC
function clearLog() { logContent.innerHTML = ''; }
function addLogHeader(text) {
    const div = document.createElement('div');
    div.style.padding = "8px"; div.style.borderBottom = "1px solid #333";
    div.style.color = "#aaa"; div.style.textAlign = "center"; div.style.fontSize = "11px";
    div.innerText = text; logContent.prepend(div);
}
function addLogEntry(item, slot, collisionCount, baseFormula, calcDetail) {
    const div = document.createElement('div');
    div.className = 'log-entry'; div.id = `log-item-${item.id}`; 
    const time = new Date().toLocaleTimeString().split(' ')[0];
    let html = `<span class="log-id">[${time}] ID: ${item.id}</span>`;
    html += `<span class="log-base">Destino: ${baseFormula}</span>`;
    if (collisionCount > 0) {
         div.classList.add('collision');
         html += `<span class="log-error">⚠️ ${collisionCount} Colisões</span>`;
         if (calcDetail) html += `<span class="log-calc">${calcDetail}</span>`;
    }
    html += `<span class="log-final">➔ Slot Final: ${slot}</span>`;
    div.innerHTML = html; logContent.prepend(div);
}
function removeLogByItemId(id) {
    const el = document.getElementById(`log-item-${id}`);
    if (el) el.remove();
}

function updateLayoutMetrics() {
    if (TABLE_SIZE <= 10) { SLOT_W = 64; currentSlotGap = 15; GRID_COLS = 5; } 
    else if (TABLE_SIZE <= 20) { SLOT_W = 50; currentSlotGap = 10; GRID_COLS = 10; } 
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
    const totalRowW = GRID_COLS * SLOT_W + (GRID_COLS - 1) * currentSlotGap;
    const startX = (canvas.width - totalRowW) / 2;
    const x = startX + col * (SLOT_W + currentSlotGap);
    const y = SHELF_START_Y + row * (SLOT_W + currentSlotGap + 15);
    return {x: x + SLOT_W/2, y: y + SLOT_W/2, size: SLOT_W};
}

const Art = {
    drawPotion: (x, y, color, scale = 1) => {
        const r = 16 * scale; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(x-r*0.3, y-r*0.3, r*0.4, 0, Math.PI*2); ctx.fill();
    },
    drawSword: (x, y, scale = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(Math.PI/4);
        ctx.fillStyle = "#cfd8dc"; ctx.fillRect(-4, -20, 8, 40); ctx.fillStyle = "#3e2723"; ctx.fillRect(-4, 20, 8, 12);
        ctx.fillStyle = "#ffca28"; ctx.fillRect(-10, 16, 20, 6); ctx.restore();
    },
    drawScanner: (x, y, active) => {
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.ellipse(x, y + 20, 80, 20, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = active ? "#4fc3f7" : "#555"; ctx.lineWidth = 2; ctx.stroke();
        if (active) {
            const grad = ctx.createLinearGradient(x, y+20, x, y-80);
            grad.addColorStop(0, "rgba(79, 195, 247, 0.2)"); grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x-50, y+20); ctx.lineTo(x+50, y+20); ctx.lineTo(x+80, y-100); ctx.lineTo(x-80, y-100); ctx.fill();
        }
        ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("SCANNER UNIT", x, y + 40);
    }
};

class Item {
    constructor(id, type, x, y) {
        this.id = id; this.type = type; this.x = x; this.y = y;
        this.targetX = x; this.targetY = y; this.state = 'WAITING'; 
        this.pathQueue = []; this.scanTimer = 0; this.finalSlotIndex = -1; 
        this.collidedThisTurn = 0;
    }
    update() {
        const dx = this.targetX - this.x; const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (this.state === 'TO_SCANNER') {
            this.x += dx * 0.1; this.y += dy * 0.1;
            if (dist < 2) { this.state = 'SCANNING'; this.scanTimer = 80; }
        } else if (this.state === 'SCANNING') {
            this.scanTimer--;
            if (this.scanTimer <= 0) shelf.calculatePath(this);
        } else if (this.state === 'MOVING_PATH') {
            this.x += dx * 0.25; this.y += dy * 0.25;
            if (dist < 5) {
                if (this.pathQueue.length > 0) {
                    const nextPoint = this.pathQueue.shift();
                    this.targetX = nextPoint.x; this.targetY = nextPoint.y;
                    if (nextPoint.action === 'STORE') {
                        this.state = 'STORED'; 
                        shelf.history.push(this); 
                        shelf.itemsCount++;
                        shelf.checkResize(); 
                        updateStats();
                        reportItemStored(); 
                    }
                }
            }
        }
    }
    draw() {
        const scale = SLOT_W / 64; 
        if (this.type === 'hp') Art.drawPotion(this.x, this.y, '#e53935', scale);
        else if (this.type === 'mp') Art.drawPotion(this.x, this.y, '#1e88e5', scale);
        else Art.drawSword(this.x, this.y, scale);
        if (SLOT_W > 25) {
            ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(10, 14 * scale)}px Arial`; ctx.textAlign = "center"; ctx.fillText(this.id, this.x, this.y + 5);
        }
        if (this.state === 'SCANNING') this.drawExplanationBubble();
    }
    drawExplanationBubble() {
        let bubbleH = 100; let bubbleY = this.y - 80;
        if (GAME_MODE === 'DOUBLE') { bubbleH = 140; bubbleY = this.y - 120; }
        const slotDestino = this.id % TABLE_SIZE;
        ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.strokeStyle = "#4fc3f7"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(this.x - 100, bubbleY - 60, 200, 100, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#aaa"; ctx.font = "14px monospace"; ctx.fillText(`Analisando ID: ${this.id}`, this.x, bubbleY - 35);
        ctx.font = "bold 20px monospace"; ctx.fillStyle = "#ffd700"; ctx.fillText(`${this.id} % ${TABLE_SIZE} = ${slotDestino}`, this.x, bubbleY);
        ctx.font = "12px Arial"; ctx.fillStyle = "#4fc3f7";
        let hint = "Destino Inicial";
        if(GAME_MODE === 'LINEAR') hint = "Se cheio: Tenta Vizinho (+1)";
        if(GAME_MODE === 'QUADRATIC') hint = "Se cheio: Tenta Salto (+i²)";
        if(GAME_MODE === 'DOUBLE') hint = `Salto Duplo: ${7 - (this.id % 7)}`;
        ctx.fillText(hint, this.x, bubbleY + 25);
        if (GAME_MODE === 'DOUBLE') {
            ctx.beginPath(); ctx.moveTo(this.x - 90, bubbleY + 75); ctx.lineTo(this.x + 90, bubbleY + 75);
            ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
            const primo = 7; const h2 = primo - (this.id % primo);
            ctx.font = "bold 16px monospace"; ctx.fillStyle = "#e040fb"; ctx.fillText(`${primo} - (${this.id} % ${primo}) = ${h2}`, this.x, bubbleY + 95);
            ctx.font = "11px Arial"; ctx.fillStyle = "#e040fb"; ctx.fillText(`Tam. do Pulo (Se colidir)`, this.x, bubbleY + 110);
        }
    }
}

class MagicShelf {
    constructor() { this.resetSlots(); this.itemsCount = 0; this.isResizing = false; this.history = []; }
    resetSlots() { this.slots = Array.from({length: TABLE_SIZE}, () => []); }
    checkResize() {
        if (this.isResizing) return;
        if (this.itemsCount / TABLE_SIZE >= MAX_LOAD_FACTOR) this.triggerExpand();
    }
    triggerExpand() {
        this.isResizing = true;
        alert(`⚠️ LIMITE DE CARGA ATINGIDO!\n\nA tabela precisa crescer de ${TABLE_SIZE} para ${TABLE_SIZE*2} slots.\n\nObserve: Como o tamanho muda (N), o cálculo do endereço (ID % N) também muda. Todos os itens serão reposicionados.`);
        setTimeout(() => {
            addLogHeader(`⚡ EXPANSÃO: ${TABLE_SIZE} ➔ ${TABLE_SIZE*2} Slots`);
            TABLE_SIZE = TABLE_SIZE * 2;
            updateLayoutMetrics();
            this.itemsCount = 0; this.history = []; this.resetSlots();
            bag.forEach(item => {
                if (item.state === 'STORED') {
                    item.state = 'WAITING'; item.pathQueue = [];
                    item.targetX = item.x; item.targetY = 50; 
                    setTimeout(() => this.startProcess(item), 800 + Math.random() * 1000); 
                }
            });
            updateStats(); this.isResizing = false;
        }, 500);
    }
    startProcess(item) {
        if(this.isResizing) return;
        item.state = 'TO_SCANNER'; item.targetX = SCANNER_POS.x; item.targetY = SCANNER_POS.y;
    }
    undoLast() {
        if (this.history.length === 0) { alert("Nada para desfazer!"); return; }
        const item = this.history.pop(); 
        const bucket = this.slots[item.finalSlotIndex];
        if (bucket) { const idx = bucket.indexOf(item); if (idx > -1) bucket.splice(idx, 1); }
        item.state = 'WAITING'; item.finalSlotIndex = -1; item.pathQueue = [];
        item.x = item.targetX = 100 + Math.random() * 700; item.y = item.targetY = 640 + Math.random() * 50;
        const savedIndex = savedBatch.findIndex(d => d.id === item.id);
        if (savedIndex > -1) savedBatch.splice(savedIndex, 1);
        this.itemsCount--; sessionItemsProcessed--; sessionCollisions -= item.collidedThisTurn; item.collidedThisTurn = 0;
        updateStats(); removeLogByItemId(item.id);
    }
    calculatePath(item) {
        const startIndex = item.id % TABLE_SIZE;
        item.state = 'MOVING_PATH'; item.pathQueue = [];
        let baseFormula = `${item.id} % ${TABLE_SIZE} = ${startIndex}`;
        let calcDetail = ""; 
        let collisionCount = 0; let finalIndex = startIndex;

        if (GAME_MODE === 'DOUBLE') { jumpMath = `H2: 7 - (${item.id}%7) = <strong>${7 - (item.id % 7)}</strong>`; }

        if (GAME_MODE === 'CHAINING') {
            this.slots[startIndex].push(item);
            const depth = this.slots[startIndex].length - 1;
            const pos = getSlotScreenPos(startIndex);
            const finalY = pos.y + 10 + (depth * (SLOT_W * 0.8));
            item.pathQueue.push({x: pos.x, y: finalY, action: 'CHECK'}); 
            item.pathQueue.push({x: pos.x, y: finalY, action: 'STORE'}); 
            finalIndex = startIndex;
            if (depth > 0) { collisionCount = depth; calcDetail = `Lista (Prof. ${depth})`; }
        } else {
            let i = 0; let found = false; let currentSlot = startIndex;
            let jumpSize = (GAME_MODE === 'DOUBLE') ? (7 - (item.id % 7)) : 1;
            while (i < TABLE_SIZE * 2) { 
                if (GAME_MODE === 'LINEAR') currentSlot = (startIndex + i) % TABLE_SIZE;
                else if (GAME_MODE === 'QUADRATIC') currentSlot = (startIndex + (i * i)) % TABLE_SIZE;
                else if (GAME_MODE === 'DOUBLE') currentSlot = (startIndex + (i * jumpSize)) % TABLE_SIZE;
                const pos = getSlotScreenPos(currentSlot);
                item.pathQueue.push({x: pos.x, y: pos.y, action: 'CHECK'});
                if (this.slots[currentSlot].length === 0) {
                    this.slots[currentSlot].push(item); 
                    item.pathQueue.push({x: pos.x, y: pos.y, action: 'CHECK'});
                    item.pathQueue.push({x: pos.x, y: pos.y, action: 'STORE'});
                    found = true; finalIndex = currentSlot; 
                    if (i > 0) {
                        if (GAME_MODE === 'LINEAR') calcDetail = `(${startIndex} + ${i}) % ${TABLE_SIZE} = ${currentSlot}`;
                        if (GAME_MODE === 'QUADRATIC') calcDetail = `(${startIndex} + ${i}²) % ${TABLE_SIZE} = ${currentSlot}`;
                        if (GAME_MODE === 'DOUBLE') calcDetail += ` ➔ (${startIndex} + ${i}×${jumpSize}) % ${TABLE_SIZE} = ${currentSlot}`;
                    }
                    break;
                } else {
                    item.pathQueue.push({x: pos.x, y: pos.y - 20, action: 'COLLISION'});
                    i++; collisionCount++;
                }
            }
            if (!found) { item.state = 'WAITING'; item.targetX = item.x; item.targetY = 650; return; }
        }
        item.finalSlotIndex = finalIndex;
        item.collidedThisTurn = collisionCount;
        addLogEntry(item, finalIndex, collisionCount, baseFormula, calcDetail);
        sessionCollisions += collisionCount;
        if (item.pathQueue.length > 0) { const first = item.pathQueue.shift(); item.targetX = first.x; item.targetY = first.y; }
    }
    draw() {
        updateLayoutMetrics();
        for (let i = 0; i < TABLE_SIZE; i++) {
            const pos = getSlotScreenPos(i);
            const size = pos.size;
            const x = pos.x - size/2; const y = pos.y - size/2;
            ctx.fillStyle = "#261612"; ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1; ctx.strokeRect(x, y, size, size);
            if (size > 25) {
                ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.font = `${Math.floor(size/2.5)}px Arial`; 
                ctx.textAlign = "center"; ctx.fillText(i, pos.x, pos.y + size/3);
            }
            if (GAME_MODE === 'CHAINING') {
                const bucket = this.slots[i];
                if (bucket.length > 1) {
                    for (let j = 1; j < bucket.length; j++) {
                        const curr = bucket[j];
                        if (curr.state === 'STORED') {
                            const prevY = (j === 1) ? pos.y : bucket[j-1].y;
                            ctx.strokeStyle = "#00bcd4"; ctx.lineWidth = 1; ctx.setLineDash([2,2]); 
                            ctx.beginPath(); ctx.moveTo(curr.x, curr.y); ctx.lineTo(curr.x, prevY + size/2); ctx.stroke(); ctx.setLineDash([]);
                        }
                    }
                }
            }
        }
    }
}

function updateStats() {
    uiSize.innerText = TABLE_SIZE;
    uiItems.innerText = shelf.itemsCount;
    const load = shelf.itemsCount / TABLE_SIZE;
    uiLoad.innerText = load.toFixed(2);
    uiBar.style.width = Math.min(load * 100, 100) + "%";
    if(load > 0.6) uiBar.style.backgroundColor = "#ff5252"; 
    else if(load > 0.4) uiBar.style.backgroundColor = "#ffca28"; 
    else uiBar.style.backgroundColor = "#4fc3f7"; 
}

function enableControls() {
    btnBatch.disabled = false; btnAddSingle.disabled = false; btnUndo.disabled = false; btnReport.disabled = false; btnCollision.disabled = false;
    logContent.innerHTML = '<div style="color:#555;text-align:center;margin-top:20px;">Laboratório Ativo.</div>';
}

function addBatch(count) {
    if (!GAME_MODE) return;
    const newItems = [];
    for(let i=0; i<count; i++) {
        const id = Math.floor(Math.random() * 1000);
        const type = Math.random() > 0.6 ? 'sword' : (Math.random() > 0.5 ? 'hp' : 'mp');
        newItems.push({id, type}); savedBatch.push({id, type});
    }
    sessionItemsProcessed += count; spawnItems(newItems);
    addLogHeader(`🎲 LOTE ADCIONADO (+${count})`);
}

function addSingleRandomItem() {
    if (!GAME_MODE) return;
    const id = Math.floor(Math.random() * 1000);
    const type = Math.random() > 0.6 ? 'sword' : (Math.random() > 0.5 ? 'hp' : 'mp');
    savedBatch.push({id, type});
    spawnItems([{id, type}]);
    sessionItemsProcessed++;
}

function forceCollision() {
     if (!GAME_MODE) return;
     let occupied = [];
     for(let i=0; i<TABLE_SIZE; i++) { if(shelf.slots[i].length > 0) occupied.push(i); }
     if(occupied.length===0) return alert("Mesa vazia! Adicione itens primeiro.");
     const target = occupied[Math.floor(Math.random()*occupied.length)];
     const newID = (Math.floor(Math.random()*50)+1)*TABLE_SIZE + target;
     savedBatch.push({id:newID, type:'sword'}); spawnItems([{id:newID, type:'sword'}]);
     addLogHeader("💥 COLISÃO FORÇADA");
     sessionItemsProcessed++;
}

function replayBatch() {
    if (savedBatch.length === 0) return;
    bag = []; TABLE_SIZE = 10; shelf = new MagicShelf(); clearLog();
    sessionCollisions = 0; sessionItemsProcessed = savedBatch.length; currentBatchProcessing = savedBatch.length;
    spawnItems(savedBatch);
    updateStats();
    addLogHeader(`🔁 AUTO-REPLAY (${GAME_MODE})`);
}

function spawnItems(itemsData) {
    itemsData.forEach(data => {
        const startX = 100 + Math.random() * 700;
        const startY = 640 + Math.random() * 50; 
        bag.push(new Item(data.id, data.type, startX, startY));
    });
}

function reportItemStored() {
    if (currentBatchProcessing > 0) currentBatchProcessing--;
}

function showReport() {
    repAlgo.innerText = GAME_MODE; repItems.innerText = sessionItemsProcessed; repCol.innerText = sessionCollisions;
    const ratio = sessionItemsProcessed > 0 ? (sessionCollisions/sessionItemsProcessed) : 0;
    let efficiency = "EXCELENTE"; let color = "#4caf50";
    if (ratio > 0.5) { efficiency = "REGULAR"; color = "#ffca28"; }
    if (ratio > 1.0) { efficiency = "BAIXA (Muitas Colisões)"; color = "#ff5252"; }
    repScore.innerText = efficiency; repScore.style.color = color;
    repDesc.innerText = `Média: ${ratio.toFixed(2)} colisões/item`;
    reportModal.classList.remove('hidden');
}
function closeModal() { reportModal.classList.add('hidden'); }

let shelf = new MagicShelf();
let bag = [];

function resetEverything() {
    bag = []; savedBatch = []; TABLE_SIZE = 10; clearLog();
    shelf = new MagicShelf(); sessionCollisions = 0; sessionItemsProcessed = 0; currentBatchProcessing = 0;
    updateStats();
}

function handleAlgoChange() {
    GAME_MODE = selectAlgo.value;
    enableControls();
    bag = []; TABLE_SIZE = 10; shelf = new MagicShelf(); clearLog();
    sessionCollisions = 0; sessionItemsProcessed = 0; 
    updateStats();
    if (savedBatch.length > 0) {
        replayBatch(); 
    }
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX; const my = (e.clientY - rect.top) * scaleY;
    for(let item of bag) {
        if(item.state === 'WAITING' && Math.hypot(mx - item.x, my - item.y) < 30) {
            shelf.startProcess(item); break;
        }
    }
});

function undoLastItem() { shelf.undoLast(); }

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Art.drawScanner(SCANNER_POS.x, SCANNER_POS.y, bag.some(i => i.state === 'SCANNING'));
    shelf.draw();
    bag.forEach(i => { i.update(); i.draw(); });
    requestAnimationFrame(loop);
}
updateStats();
updateLayoutMetrics(); // Force Initial Draw
loop();