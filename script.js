document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const selectAlgo = document.getElementById('algoSelect');
    const logContent = document.getElementById('log-content');

    // Groups
    const modeSwitch = document.getElementById('modeSwitch');
    const infoSandbox = document.getElementById('info-sandbox');
    const infoQuest = document.getElementById('info-quest');
    const controlsLab = document.getElementById('controls-lab');
    const controlsQuest = document.getElementById('controls-quest');
    const questOverlay = document.getElementById('quest-overlay');

    // UI Elements
    const uiSize = document.getElementById('statSize');
    const uiItems = document.getElementById('statItems');
    const uiLoad = document.getElementById('statLoad');
    const uiBar = document.getElementById('loadBar');
    const coinVal = document.getElementById('coinVal');
    const questText = document.getElementById('questText');
    const questOptionsContainer = document.getElementById('quest-options-container');
    const questFeedback = document.getElementById('questFeedback');

    // Buttons
    const btnBatch = document.getElementById('btnBatch');
    const btnAddSingle = document.getElementById('btnAddSingle');
    const btnCollision = document.getElementById('btnCollision');
    const btnUndo = document.getElementById('btnUndo');
    const btnReport = document.getElementById('btnReport');
    const btnClear = document.getElementById('btnClear');
    const btnCenterQuest = document.getElementById('btnCenterQuest');
    const btnTestQuest = document.getElementById('btnTestQuest');
    const btnStartIntro = document.getElementById('btnStartIntro');
    const btnHelp = document.getElementById('btnHelp');
    const btnCloseReport = document.getElementById('btnCloseReport');

    // Modals
    const introModal = document.getElementById('intro-modal');
    const reportModal = document.getElementById('report-modal');
    const repAlgo = document.getElementById('rep-algo');
    const repItems = document.getElementById('rep-items');
    const repCol = document.getElementById('rep-col');
    const repScore = document.getElementById('rep-score');
    const repDesc = document.getElementById('rep-desc');

    // --- CONFIG ---
    let TABLE_SIZE = 10;
    let SLOT_W = 64;       
    let GRID_COLS = 10;    
    let currentSlotGap = 15;
    let SHELF_START_Y = 100;
    const SCANNER_POS = { x: canvas.width / 2, y: 580 };

    let GAME_MODE = null; 
    const MAX_LOAD_FACTOR = 0.7; 
    let CURRENT_MODE = 'SANDBOX';

    // --- STATE ---
    let savedBatch = []; 
    let currentBatchProcessing = 0; 
    let sessionCollisions = 0; 
    let sessionItemsProcessed = 0; 
    let coins = 0;
    let currentQuestData = null;
    let bag = [];

    // --- LISTENERS ---
    if(btnStartIntro) btnStartIntro.onclick = () => introModal.classList.add('hidden');
    if(btnHelp) btnHelp.onclick = () => introModal.classList.remove('hidden');
    if(btnCloseReport) btnCloseReport.onclick = () => reportModal.classList.add('hidden');

    modeSwitch.onclick = toggleMode;

    // Lab Actions
    btnBatch.onclick = () => addBatch(10);
    btnAddSingle.onclick = addSingleRandomItem;
    btnCollision.onclick = forceCollision;
    btnUndo.onclick = undoLastItem;
    btnReport.onclick = showReport;
    btnClear.onclick = resetEverything;
    selectAlgo.onchange = handleAlgoChange;

    // Quest Actions
    if(btnCenterQuest) btnCenterQuest.onclick = startRandomQuest;
    btnTestQuest.onclick = testQuestHypothesis;

    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        for(let item of bag) {
            if(item.state === 'WAITING' && Math.hypot(mx - item.x, my - item.y) < 30) {
                shelf.startProcess(item); break;
            }
        }
    };

    // --- TOGGLE MODE ---
    function toggleMode() {
        if (CURRENT_MODE === 'SANDBOX') {
            CURRENT_MODE = 'QUEST';
            modeSwitch.classList.remove('sandbox'); modeSwitch.classList.add('quest');
            
            // Oculta LAB (Esq + Dir)
            infoSandbox.classList.add('hidden');
            controlsLab.classList.add('hidden');
            
            // Mostra QUEST (Esq + Dir + Centro)
            infoQuest.classList.remove('hidden');
            controlsQuest.classList.remove('hidden');
            questOverlay.classList.remove('hidden');
            btnCenterQuest.innerText = "📜 INICIAR NOVA MISSÃO";
            
            resetEverything(true);
        } else {
            CURRENT_MODE = 'SANDBOX';
            modeSwitch.classList.remove('quest'); modeSwitch.classList.add('sandbox');
            
            infoQuest.classList.add('hidden');
            controlsQuest.classList.add('hidden');
            questOverlay.classList.add('hidden');
            
            infoSandbox.classList.remove('hidden');
            controlsLab.classList.remove('hidden');
            
            resetEverything(true);
        }
    }

    // --- QUEST SYSTEM ---
    const QUESTS = [
        {
            text: "No <strong>Linear Probing</strong> (Tamanho 10), o slot 5 está ocupado. Onde o item <strong>25</strong> vai cair?",
            setup: () => {
                TABLE_SIZE = 10; GAME_MODE = 'LINEAR';
                bag.push(new Item(15, 'potion', 100, 640)); shelf.startProcess(bag[0]);
            },
            testItem: { id: 25, type: 'sword' },
            correct: 6, options: [5, 6, 7, 2]
        },
        {
            text: "No <strong>Hash Duplo</strong> (H2 = 7-k%7), onde o item <strong>12</strong> cairá se o slot 2 estiver cheio?",
            setup: () => {
                TABLE_SIZE = 10; GAME_MODE = 'DOUBLE';
                bag.push(new Item(22, 'potion', 100, 640)); shelf.startProcess(bag[0]);
            },
            testItem: { id: 12, type: 'sword' },
            correct: 4, options: [2, 3, 4, 9]
        }
    ];

    function startRandomQuest() {
        resetEverything(false);
        currentQuestData = QUESTS[Math.floor(Math.random() * QUESTS.length)];
        
        questOverlay.classList.add('hidden');
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
            questFeedback.innerHTML = "✅ CORRETO! +50 Moedas";
            questFeedback.className = "feedback-box correct";
            Array.from(questOptionsContainer.children).forEach(b => b.disabled = true);
            setTimeout(() => {
                btnCenterQuest.innerText = "PRÓXIMA MISSÃO ➡";
                questOverlay.classList.remove('hidden');
            }, 1200);
        } else {
            questFeedback.innerHTML = "❌ ERROU! Teste na mesa.";
            questFeedback.className = "feedback-box wrong";
            btnElement.disabled = true;
        }
    }

    // --- LAB LOGIC ---
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
         if(occupied.length===0) return alert("Mesa vazia! Adicione itens primeiro.");
         const target = occupied[Math.floor(Math.random()*occupied.length)];
         const newID = (Math.floor(Math.random()*50)+1)*TABLE_SIZE + target;
         savedBatch.push({id:newID, type:'sword'}); spawnItems([{id:newID, type:'sword'}]);
         sessionItemsProcessed++;
         addLogHeader(`💥 COLISÃO FORÇADA (Alvo: ${target})`);
    }

    function replayBatch() {
        if (savedBatch.length === 0) return;
        bag = []; TABLE_SIZE = 10; shelf = new MagicShelf(); clearLog();
        sessionCollisions = 0; sessionItemsProcessed = savedBatch.length; 
        spawnItems(savedBatch);
        updateStats();
        addLogHeader(`🔁 REPLAY (${GAME_MODE})`);
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

    // --- SETUP ---
    function resetEverything(fullReset = false) {
        bag = []; savedBatch = []; TABLE_SIZE = 10; clearLog();
        shelf = new MagicShelf(); sessionCollisions = 0; sessionItemsProcessed = 0; 
        updateStats(); updateLayoutMetrics();
        if (fullReset) {
            // Reset UI specific if needed
        }
    }

    function handleAlgoChange() {
        GAME_MODE = selectAlgo.value;
        enableControls();
        bag = []; TABLE_SIZE = 10; shelf = new MagicShelf(); clearLog();
        sessionCollisions = 0; sessionItemsProcessed = 0; 
        updateStats(); updateLayoutMetrics();
        if (savedBatch.length > 0) {
            addLogHeader(`🔁 REPLAY AUTOMÁTICO (${GAME_MODE})`);
            sessionItemsProcessed = savedBatch.length;
            spawnItems(savedBatch);
        }
    }

    function enableControls() {
        btnBatch.disabled = false; btnAddSingle.disabled = false; btnUndo.disabled = false; 
        btnReport.disabled = false; btnCollision.disabled = false;
        logContent.innerHTML = '<div style="color:#555;text-align:center;margin-top:20px;">Laboratório Ativo.</div>';
    }
    
    function clearLog() { logContent.innerHTML = ''; }
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
        const col = index % GRID_COLS; const row = Math.floor(index / GRID_COLS);
        const totalW = GRID_COLS * SLOT_W + (GRID_COLS-1)*currentSlotGap;
        const startX = (canvas.width - totalW) / 2;
        const x = startX + col * (SLOT_W + currentSlotGap);
        const y = SHELF_START_Y + row * (SLOT_W + currentSlotGap + 15);
        return {x: x + SLOT_W/2, y: y + SLOT_W/2, size: SLOT_W};
    }

    function updateStats() {
        uiSize.innerText = TABLE_SIZE; uiItems.innerText = shelf.itemsCount;
        const load = shelf.itemsCount/TABLE_SIZE;
        uiLoad.innerText = (load*100).toFixed(0) + "%";
        uiBar.style.width = Math.min(load*100, 100) + "%";
        uiBar.style.backgroundColor = load > 0.7 ? "#ff5252" : "#4fc3f7";
    }

    // --- CLASSES ---
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
            this.pathQueue = []; this.scanTimer = 0; this.finalSlotIndex = -1; this.collidedThisTurn = 0;
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
                            shelf.history.push(this); shelf.itemsCount++; shelf.checkResize(); updateStats(); reportItemStored(); 
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
            if(this.isResizing || this.itemsCount/TABLE_SIZE < MAX_LOAD_FACTOR) return;
            this.isResizing = true;
            alert(`⚠️ LIMITE DE CARGA ATINGIDO!\n\nA tabela precisa crescer de ${TABLE_SIZE} para ${TABLE_SIZE*2} slots.`);
            setTimeout(() => {
                addLogHeader(`⚡ EXPANSÃO: ${TABLE_SIZE} ➔ ${TABLE_SIZE*2} Slots`);
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
                if(s > 25) { ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.font = `${Math.floor(s/2.5)}px Arial`; ctx.textAlign = "center"; ctx.fillText(i, pos.x, pos.y+s/3); }
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

    let shelf = new MagicShelf();
    
    function undoLastItem() { shelf.undoLast(); }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        Art.drawScanner(SCANNER_POS.x, SCANNER_POS.y, bag.some(i => i.state === 'SCANNING'));
        shelf.draw();
        bag.forEach(i => { i.update(); i.draw(); });
        requestAnimationFrame(loop);
    }

    updateStats();
    updateLayoutMetrics(); // FORCE INIT
    loop();
});