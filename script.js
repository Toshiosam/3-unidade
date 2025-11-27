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
    const algoInfoBox = document.getElementById('algoInfo');

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

    // --- CONFIGURAÇÃO GEOMÉTRICA ---
    let TABLE_SIZE = 10;
    let SLOT_W = 64;       
    let GRID_COLS = 10;    
    let currentSlotGap = 15;
    
    // POSIÇÕES FIXAS E SEGURAS
    // Shelf em Y=120 (Topo)
    let SHELF_START_Y = 120; 
    // Scanner em Y=480 (Rodapé visível dentro de 600px)
    const SCANNER_POS = { x: 450, y: 480 }; 

    let GAME_MODE = null; 
    const MAX_LOAD_FACTOR = 0.7; 
    let CURRENT_MODE = 'SANDBOX';

    // --- TEXTOS ---
    const ALGO_DESCRIPTIONS = {
        'CHAINING': `
            <strong>⛓️ ENCADEAMENTO (SEPARATE CHAINING)</strong><br><br>
            <strong>Implementação:</strong> Mantém um vetor de ponteiros. Cada slot aponta para o início de uma Lista Encadeada (Linked List).<br>
            <strong>Funcionamento:</strong> <code>h(k) = k % N</code>. Se o slot estiver ocupado, o novo item é inserido no final da lista daquele slot.<br>
            <strong>Análise Técnica:</strong><br>
            <span style="color:#50fa7b">✔</span> Tolera Fator de Carga $\\alpha > 1$.<br>
            <span style="color:#ff5555">✘</span> Performance degrada para $O(n)$ se a lista crescer muito.<br>
            <span style="color:#ff5555">✘</span> Baixa localidade de referência (Cache Miss) devido aos ponteiros dispersos.
        `,
        'LINEAR': `
            <strong>➡️ SONDAGEM LINEAR (OPEN ADDRESSING)</strong><br><br>
            <strong>Implementação:</strong> Todos os dados ficam no próprio vetor. Não usa memória extra para ponteiros.<br>
            <strong>Funcionamento:</strong> Se <code>h(k)</code> colidir, tenta <code>(h(k)+1) % N</code>, depois <code>+2</code>, etc.<br>
            <strong>Análise Técnica:</strong><br>
            <span style="color:#50fa7b">✔</span> Excelente uso de Cache (CPU prefetching) por acessar memória contígua.<br>
            <span style="color:#ff5555">✘</span> Sofre de <strong>Agrupamento Primário</strong>: Clusters de ocupados aumentam a chance de colisão, criando um efeito "bola de neve".
        `,
        'QUADRATIC': `
            <strong>⤴️ SONDAGEM QUADRÁTICA</strong><br><br>
            <strong>Implementação:</strong> Endereçamento Aberto com saltos não-lineares.<br>
            <strong>Funcionamento:</strong> Em colisão, tenta índices: <code>(h(k) + i²) % N</code>. (Saltos: 1, 4, 9, 16...).<br>
            <strong>Análise Técnica:</strong><br>
            <span style="color:#50fa7b">✔</span> Elimina o Agrupamento Primário (clusters lineares).<br>
            <span style="color:#ff5555">✘</span> Pode sofrer de <strong>Agrupamento Secundário</strong>: Chaves com o mesmo hash inicial percorrem exatamente o mesmo caminho de saltos.
        `,
        'DOUBLE': `
            <strong>🔀 HASH DUPLO (DOUBLE HASHING)</strong><br><br>
            <strong>Implementação:</strong> Requer duas funções hash independentes ($h_1$ e $h_2$).<br>
            <strong>Funcionamento:</strong> O salto é calculado pelo próprio dado: <code>passo = h2(k)</code>. Próximo índice: <code>(index + passo) % N</code>.<br>
            <strong>Análise Técnica:</strong><br>
            <span style="color:#50fa7b">✔</span> Distribuição mais uniforme possível. Minimiza drasticamente colisões.<br>
            <span style="color:#ff5555">✘</span> Cálculo mais custoso (duas funções hash por operação).
        `
    };

    const LAB_GUIDES = {
        'INITIAL': `
            <strong>👋 Olá! Bem-vindo ao Laboratório.</strong><br>
            Imagine que esta tela é um "estacionamento de dados". Para começar a guardar informações aqui, escolha um <strong>Método de Organização (Protocolo)</strong> no menu à direita.
        `,
        'CHAINING': `
            <strong>🧪 MODO: ENCADEAMENTO (A TÉCNICA DA "LISTA")</strong><br>
            <strong>A Ideia:</strong> Imagine uma gaveta de arquivos. Se a gaveta encher, nós não procuramos outra; nós simplesmente amarramos um saquinho nela e colocamos o arquivo lá.<br>
            <strong>O que observar:</strong> Veja como os itens se empilham verticalmente. O slot nunca "entope", ele apenas cria uma fila maior.
        `,
        'LINEAR': `
            <strong>🧪 MODO: SONDAGEM LINEAR (O VIZINHO MAIS PRÓXIMO)</strong><br>
            <strong>A Ideia:</strong> Igual a estacionar o carro em dia de show. Se a sua vaga favorita está ocupada, você tenta a imediatamente ao lado. Se estiver ocupada também, tenta a próxima, e a próxima...<br>
            <strong>O que observar:</strong> Veja como se formam "bloquinhos" sólidos de dados. Isso é ruim, pois quem chega depois tem que andar muito para achar vaga.
        `,
        'QUADRATIC': `
            <strong>🧪 MODO: SONDAGEM QUADRÁTICA (O PULO DO CANGURU)</strong><br>
            <strong>A Ideia:</strong> Para evitar a aglomeração do método Linear, aqui se a vaga está cheia, nós damos um pulo pequeno, depois um médio, depois um gigante.<br>
            <strong>O que observar:</strong> Note como os itens ficam mais espalhados pela mesa, evitando criar aquelas "paredes" de dados ocupados.
        `,
        'DOUBLE': `
            <strong>🧪 MODO: HASH DUPLO (SALTO PERSONALIZADO)</strong><br>
            <strong>A Ideia:</strong> Aqui, cada dado tem um "número da sorte". Se ocorrer uma colisão, o dado usa esse número para decidir o tamanho do seu pulo.<br>
            <strong>O que observar:</strong> É o método mais caótico e eficiente. Mesmo que dois itens batam na mesma vaga, eles vão para lugares totalmente diferentes logo em seguida.
        `
    };

    // --- STATE ---
    let savedBatch = []; 
    let currentBatchProcessing = 0; 
    let sessionCollisions = 0; 
    let sessionItemsProcessed = 0; 
    let coins = 0;
    let currentQuestData = null;
    let bag = [];
    let questStartTime = 0;
    let questTestUsed = false;

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
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        
        for(let item of bag) {
            if(item.state === 'WAITING' && Math.hypot(mx - item.x, my - item.y) < 50) {
                shelf.startProcess(item); break;
            }
        }
    };

    // --- TOGGLE MODE ---
    function toggleMode() {
        if (CURRENT_MODE === 'SANDBOX') {
            CURRENT_MODE = 'QUEST';
            modeSwitch.classList.remove('sandbox'); modeSwitch.classList.add('quest');
            
            infoQuest.classList.remove('hidden');
            questOverlay.classList.remove('hidden');
            document.querySelector('#info-quest .quest-title').innerText = "PERGAMINHO DE MISSÃO"; 
            btnCenterQuest.innerText = "📜 INICIAR NOVA MISSÃO";
            
            controlsLab.classList.add('hidden');
            controlsQuest.classList.remove('hidden');
            
            resetEverything(true);
        } else {
            CURRENT_MODE = 'SANDBOX';
            modeSwitch.classList.remove('quest'); modeSwitch.classList.add('sandbox');
            
            questOverlay.classList.add('hidden');
            controlsQuest.classList.add('hidden');
            controlsLab.classList.remove('hidden');
            
            resetEverything(true);
            updateTopPanelForLab();
        }
    }

    function updateTopPanelForLab() {
        if (CURRENT_MODE !== 'SANDBOX') return;
        const title = document.querySelector('#info-quest .quest-title');
        const text = document.querySelector('#info-quest .quest-text');
        title.innerText = "🔬 MONITOR DE LABORATÓRIO";
        if (GAME_MODE && LAB_GUIDES[GAME_MODE]) {
            text.innerHTML = LAB_GUIDES[GAME_MODE];
        } else {
            text.innerHTML = LAB_GUIDES['INITIAL'];
        }
        infoQuest.classList.remove('hidden');
    }

    // --- QUEST SYSTEM ---
    function startRandomQuest() {
        resetEverything(false);
        currentQuestData = generateDynamicQuest();
        questTestUsed = false;
        questStartTime = Date.now();

        if (ALGO_DESCRIPTIONS[currentQuestData.algoMode]) {
            algoInfoBox.innerHTML = ALGO_DESCRIPTIONS[currentQuestData.algoMode];
        }

        questOverlay.classList.add('hidden');
        questFeedback.classList.add('hidden');
        questText.innerHTML = currentQuestData.text;
        btnTestQuest.disabled = false;
        
        questOptionsContainer.innerHTML = '';
        
        let opts = [...currentQuestData.options];
        if (currentQuestData.type === 'RESIZE') opts.sort((a,b) => a - b);
        else opts.sort(() => Math.random() - 0.5);

        opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            if (currentQuestData.type === 'RESIZE') btn.innerText = `📏 Novo Tamanho: ${opt}`;
            else btn.innerText = `👉 Slot ${opt}`;
            btn.onclick = () => checkAnswer(opt, btn);
            questOptionsContainer.appendChild(btn);
        });

        currentQuestData.setup();
        addLogHeader(`⚔️ MISSÃO INICIADA: ${currentQuestData.algoMode}`);
    }

    function generateDynamicQuest() {
        const missionType = Math.random() > 0.3 ? 'COLLISION' : 'RESIZE';
        const types = ['LINEAR', 'QUADRATIC', 'DOUBLE'];
        const algoType = types[Math.floor(Math.random() * types.length)];
        const tblSize = 10; 
        
        if (missionType === 'COLLISION') {
            const occupiedSlot = Math.floor(Math.random() * tblSize);
            const itemVisuals = ['cube', 'sphere', 'prism'];
            const visualOccupier = itemVisuals[Math.floor(Math.random() * itemVisuals.length)];
            
            const setupFunc = () => {
                TABLE_SIZE = tblSize; 
                GAME_MODE = algoType;
                const obstacle = new Item(occupiedSlot, visualOccupier, 100, SCANNER_POS.y);
                bag.push(obstacle); 
                shelf.startProcess(obstacle);
            };

            const testId = (Math.floor(Math.random() * 5) + 1) * tblSize + occupiedSlot;
            const visualTest = itemVisuals[Math.floor(Math.random() * itemVisuals.length)];
            
            let questionText = "";
            let correctAnswer = -1;

            if (algoType === 'LINEAR') {
                correctAnswer = (occupiedSlot + 1) % tblSize;
                questionText = `
                    <div style="font-size:14px; color:#8be9fd; margin-bottom:5px">ALGORITMO: LINEAR PROBING</div>
                    O Slot <strong>${occupiedSlot}</strong> já está ocupado.<br>
                    O sistema tenta inserir o ID <strong>${testId}</strong> (Hash ${occupiedSlot}).<br>
                    Usando a regra de <strong>+1</strong>, em qual índice ele será alocado?
                `;
            } 
            else if (algoType === 'QUADRATIC') {
                correctAnswer = (occupiedSlot + 1) % tblSize; 
                questionText = `
                    <div style="font-size:14px; color:#8be9fd; margin-bottom:5px">ALGORITMO: SONDAGEM QUADRÁTICA</div>
                    Houve colisão no Slot <strong>${occupiedSlot}</strong>.<br>
                    O protocolo diz para tentar: <code>(Indice + 1²)</code>.<br>
                    Qual será o destino final do item <strong>${testId}</strong>?
                `;
            } 
            else if (algoType === 'DOUBLE') {
                const h2 = 7 - (testId % 7);
                correctAnswer = (occupiedSlot + h2) % tblSize;
                questionText = `
                    <div style="font-size:14px; color:#8be9fd; margin-bottom:5px">ALGORITMO: HASH DUPLO</div>
                    O Slot <strong>${occupiedSlot}</strong> colidiu.<br>
                    O salto deste item é calculado por <code>H2 = 7 - (${testId} % 7)</code>.<br>
                    Sabendo que o salto deu <strong>${h2}</strong>, onde o item cai?
                `;
            }

            const opts = new Set([correctAnswer]);
            while(opts.size < 4) {
                const rnd = Math.floor(Math.random() * tblSize);
                if (rnd !== correctAnswer) opts.add(rnd);
            }

            return {
                algoMode: algoType,
                text: questionText,
                setup: setupFunc,
                testItem: { id: testId, type: visualTest },
                correct: correctAnswer,
                options: Array.from(opts),
                type: 'COLLISION'
            };
        } else {
            const currentItems = 7; 
            const setupFunc = () => {
                TABLE_SIZE = 10;
                GAME_MODE = 'LINEAR'; 
                for(let i=0; i<currentItems; i++) {
                    const it = new Item(i, 'cube', 100, SCANNER_POS.y);
                    it.state = 'STORED';
                    it.finalSlotIndex = i;
                    shelf.slots[i].push(it);
                    shelf.itemsCount++;
                }
                updateStats();
            };

            const questionText = `
                <div style="font-size:14px; color:#ff79c6; margin-bottom:5px">PROTOCOLO: GERENCIAMENTO DE MEMÓRIA</div>
                A tabela atual tem tamanho <strong>N=10</strong>.<br>
                O Fator de Carga Máximo é <strong>0.7 (70%)</strong>.<br>
                Já existem <strong>7 itens</strong> armazenados.<br>
                Se tentarmos inserir mais UM item, o que acontece com o tamanho N?
            `;

            return {
                algoMode: 'LINEAR', 
                text: questionText,
                setup: setupFunc,
                testItem: { id: 99, type: 'sphere' }, 
                correct: 20, 
                options: [10, 11, 20, 100],
                type: 'RESIZE'
            };
        }
    }

    function testQuestHypothesis() {
        if (!currentQuestData) return;
        questTestUsed = true;
        const t = currentQuestData.testItem;
        const testItem = new Item(t.id, t.type, 450, SCANNER_POS.y + 50); 
        bag.push(testItem);
        shelf.startProcess(testItem);
        btnTestQuest.disabled = true;
        addLogHeader(`🧪 TESTE EXECUTADO: ID ${t.id}`);
    }

    function checkAnswer(selected, btnElement) {
        const isCorrect = selected === currentQuestData.correct;
        questFeedback.classList.remove('hidden');
        
        if (isCorrect) {
            const timeTaken = (Date.now() - questStartTime) / 1000;
            const isFast = timeTaken <= 15; 
            let points = 100;
            let msg = "";

            if (isFast) { points += 50; msg += "⚡ Bônus de Tempo (+50) "; }
            if (questTestUsed) { points = points / 2; msg += "🧪 Teste usado (50%) "; }

            coins += points;
            coinVal.innerText = coins;
            
            questFeedback.innerHTML = `✅ CORRETO! Ganhou ${points} Pontos.<br><span style="font-size:11px; color:#aaa">${msg}</span>`;
            questFeedback.className = "feedback-box correct";
            
            Array.from(questOptionsContainer.children).forEach(b => b.disabled = true);
            setTimeout(() => {
                btnCenterQuest.innerText = "PRÓXIMA MISSÃO ➡";
                questOverlay.classList.remove('hidden');
            }, 1500);
        } else {
            let errorMsg = `A resposta correta era <strong>${currentQuestData.correct}</strong>.`;
            if (currentQuestData.type === 'RESIZE') errorMsg = "A tabela dobra de tamanho (20) ao atingir a carga.";

            questFeedback.innerHTML = `❌ ERROU! ${errorMsg}<br><span style="font-size:11px">Sem pontos desta vez.</span>`;
            questFeedback.className = "feedback-box wrong";
            Array.from(questOptionsContainer.children).forEach(b => b.disabled = true);
            
            setTimeout(() => {
                btnCenterQuest.innerText = "TENTAR OUTRA MISSÃO ↻";
                questOverlay.classList.remove('hidden');
            }, 2500);
        }
    }

    // --- LAB LOGIC ---
    function addBatch(count) {
        if (!GAME_MODE) { alert("⚠️ Selecione um Protocolo (Algoritmo) no menu acima primeiro!"); return; }
        const newItems = [];
        const visuals = ['cube', 'sphere', 'prism'];
        for(let i=0; i<count; i++) {
            const id = Math.floor(Math.random() * 1000);
            const type = visuals[Math.floor(Math.random() * visuals.length)];
            newItems.push({id, type}); savedBatch.push({id, type});
        }
        sessionItemsProcessed += count; spawnItems(newItems);
        addLogHeader(`🎲 LOTE ADCIONADO (+${count})`);
    }

    function addSingleRandomItem() {
        if (!GAME_MODE) { alert("⚠️ Selecione um Protocolo (Algoritmo) no menu acima primeiro!"); return; }
        const id = Math.floor(Math.random() * 1000);
        const visuals = ['cube', 'sphere', 'prism'];
        const type = visuals[Math.floor(Math.random() * visuals.length)];
        savedBatch.push({id, type}); spawnItems([{id, type}]);
        sessionItemsProcessed++;
    }

    function forceCollision() {
         if (!GAME_MODE) return alert("Selecione um Algoritmo primeiro.");
         let occupied = [];
         for(let i=0; i<TABLE_SIZE; i++) { if(shelf.slots[i].length > 0) occupied.push(i); }
         if(occupied.length===0) return alert("Mesa vazia! Adicione itens primeiro.");
         const target = occupied[Math.floor(Math.random()*occupied.length)];
         const newID = (Math.floor(Math.random()*50)+1)*TABLE_SIZE + target;
         savedBatch.push({id:newID, type:'cube'}); spawnItems([{id:newID, type:'cube'}]);
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
        itemsData.forEach((data, index) => {
            // CORREÇÃO: Nasce EXATAMENTE no scanner, coordenadas seguras
            const startX = SCANNER_POS.x; 
            const startY = SCANNER_POS.y; 
            
            const newItem = new Item(data.id, data.type, startX, startY);
            bag.push(newItem);
            
            // Delay sequencial
            setTimeout(() => {
                shelf.startProcess(newItem);
            }, index * 300);
        });
    }

    function reportItemStored() {
        if (currentBatchProcessing > 0) currentBatchProcessing--;
    }

    function showReport() {
        repAlgo.innerText = GAME_MODE; repItems.innerText = sessionItemsProcessed; repCol.innerText = sessionCollisions;
        const ratio = sessionItemsProcessed > 0 ? (sessionCollisions/sessionItemsProcessed) : 0;
        let efficiency = "EXCELENTE"; let color = "#50fa7b";
        if (ratio > 0.5) { efficiency = "REGULAR"; color = "#f1fa8c"; }
        if (ratio > 1.0) { efficiency = "BAIXA (Muitas Colisões)"; color = "#ff5555"; }
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
        if (fullReset) { /* Reset UI */ }
    }

    function handleAlgoChange() {
        GAME_MODE = selectAlgo.value;
        enableControls();
        if (ALGO_DESCRIPTIONS[GAME_MODE]) algoInfoBox.innerHTML = ALGO_DESCRIPTIONS[GAME_MODE];
        updateTopPanelForLab();
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
        logContent.innerHTML = '<div style="color:#6272a4;text-align:center;margin-top:20px;">Laboratório Ativo.</div>';
    }
    
    function clearLog() { logContent.innerHTML = ''; }
    function addLogHeader(text) {
        const div = document.createElement('div');
        div.style.padding = "8px"; div.style.borderBottom = "1px solid #44475a";
        div.style.color = "#6272a4"; div.style.textAlign = "center"; div.style.fontSize = "11px";
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

    // --- LAYOUT ---
    function updateLayoutMetrics() {
        GRID_COLS = 10; 
        const availableWidth = 900; 
        const totalGap = (GRID_COLS - 1) * 10;
        const maxSlotW = (availableWidth - totalGap) / GRID_COLS;
        SLOT_W = Math.min(64, Math.max(30, maxSlotW));
        currentSlotGap = 10;
    }

    function getSlotScreenPos(index) {
        const col = index % GRID_COLS;
        const row = Math.floor(index / GRID_COLS);
        const totalW = GRID_COLS * SLOT_W + (GRID_COLS-1) * currentSlotGap;
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
        uiBar.style.backgroundColor = load > 0.7 ? "#ff5555" : "#50fa7b";
    }

    // --- ARTE DRACULA (SÓLIDA E VISÍVEL) ---
    const Art = {
        drawDataCube: (x, y, color, scale = 1) => {
            const s = 30 * scale;
            // Preenchimento Sólido com leve transparência
            ctx.fillStyle = color; 
            ctx.fillRect(x - s/2, y - s/2, s, s);
            
            // Borda Branca
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
            ctx.strokeRect(x - s/2, y - s/2, s, s);
            
            // Detalhe interno escuro
            ctx.fillStyle = "rgba(0,0,0,0.5)"; 
            ctx.fillRect(x - s/4, y - s/4, s/2, s/2);
        },
        drawDataSphere: (x, y, color, scale = 1) => {
            const r = 16 * scale; 
            ctx.fillStyle = color; 
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
        },
        drawDataPrism: (x, y, color, scale = 1) => {
            const s = 18 * scale;
            ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y + s); ctx.closePath();
            ctx.fillStyle = color; ctx.fill();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
        },
        drawScanner: (x, y, active) => {
            const baseColor = active ? "#8be9fd" : "#44475a";
            ctx.strokeStyle = baseColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(x, y + 20, 80, 20, 0, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(x, y + 20, 60, 15, 0, 0, Math.PI*2); ctx.stroke();
            
            if (active) {
                const grad = ctx.createLinearGradient(x, y+20, x, y-80);
                grad.addColorStop(0, "rgba(139, 233, 253, 0.4)"); grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x-50, y+20); ctx.lineTo(x+50, y+20); ctx.lineTo(x+60, y-100); ctx.lineTo(x-60, y-100); ctx.fill();
            }
            ctx.fillStyle = "#f8f8f2"; ctx.font = "12px Consolas"; ctx.textAlign = "center"; 
            ctx.fillText(active ? "PROCESSANDO..." : "AGUARDANDO INPUT", x, y + 55);
        }
    };

    class Item {
        constructor(id, type, x, y) {
            this.id = id; this.type = type; this.x = x; this.y = y;
            this.targetX = x; this.targetY = y; this.state = 'WAITING'; 
            this.pathQueue = [];
        }
        update() {
            const dx = this.targetX - this.x; const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);
            
            if(dist > 1) {
                this.x += dx * 0.15;
                this.y += dy * 0.15;
            }

            if (this.state === 'TO_SCANNER' && dist < 5) {
                this.state = 'SCANNING'; 
                setTimeout(() => shelf.calculatePath(this), 500); 
            } 
            else if (this.state === 'MOVING_PATH' && dist < 5) {
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
        draw() {
            const scale = SLOT_W / 64; 
            if (this.type === 'cube') Art.drawDataCube(this.x, this.y, '#ff5555', scale); 
            else if (this.type === 'sphere') Art.drawDataSphere(this.x, this.y, '#8be9fd', scale); 
            else if (this.type === 'prism') Art.drawDataPrism(this.x, this.y, '#f1fa8c', scale); 
            else Art.drawDataCube(this.x, this.y, '#6272a4', scale); 

            if (SLOT_W > 25) {
                ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(10, 14 * scale)}px monospace`; ctx.textAlign = "center"; 
                ctx.fillText(this.id, this.x, this.y + 5);
            }
            if (this.state === 'SCANNING') this.drawExplanationBubble();
        }
        drawExplanationBubble() {
            let bubbleY = this.y - 60;
            const slotDestino = this.id % TABLE_SIZE;
            ctx.fillStyle = "rgba(40, 42, 54, 0.9)"; ctx.strokeStyle = "#8be9fd"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.rect(this.x - 80, bubbleY - 40, 160, 60); ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = "#fff"; ctx.font = "12px monospace"; 
            ctx.fillText(`ID: ${this.id}`, this.x, bubbleY - 20);
            ctx.fillStyle = "#ff5555"; ctx.font = "bold 14px monospace";
            ctx.fillText(`Hash: ${slotDestino}`, this.x, bubbleY);
        }
    }

    class MagicShelf {
        constructor() { this.resetSlots(); this.itemsCount = 0; this.isResizing = false; this.history = []; }
        resetSlots() { this.slots = Array.from({length: TABLE_SIZE}, () => []); }
        
        checkResize() {
            if(this.isResizing || this.itemsCount/TABLE_SIZE < MAX_LOAD_FACTOR) return;
            this.isResizing = true;
            alert(`⚠️ CARGA ALTA! Expandindo memória...`);
            setTimeout(() => {
                addLogHeader(`⚡ EXPANSÃO: ${TABLE_SIZE} ➔ ${TABLE_SIZE*2} Slots. Re-Hashing...`);
                TABLE_SIZE *= 2; updateLayoutMetrics(); this.resetSlots(); this.itemsCount = 0; this.history = []; 
                bag.forEach(item => {
                    item.state = 'WAITING'; item.pathQueue = [];
                    item.x = SCANNER_POS.x; item.y = SCANNER_POS.y;
                    setTimeout(() => this.startProcess(item), 500 + Math.random()*1000);
                });
                updateStats(); this.isResizing = false;
            }, 500);
        }

        startProcess(item) { 
            if(!this.isResizing) { item.state='TO_SCANNER'; item.targetX=SCANNER_POS.x; item.targetY=SCANNER_POS.y; } 
        }
        
        undoLast() {
            if(this.history.length === 0) return alert("Nada para desfazer!");
            const item = this.history.pop();
            const bucket = this.slots[item.finalSlotIndex];
            if(bucket) { const idx = bucket.indexOf(item); if(idx > -1) bucket.splice(idx, 1); }
            item.state = 'WAITING'; item.pathQueue = [];
            item.x = SCANNER_POS.x; item.y = SCANNER_POS.y; item.targetX = SCANNER_POS.x; item.targetY = SCANNER_POS.y;
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
                item.pathQueue.push({x: pos.x, y: pos.y, action: 'CHECK'});
                item.pathQueue.push({x: pos.x, y: pos.y + (depth*pos.size), action: 'STORE'});
                item.finalSlotIndex = start;
                if(depth > 0) { cols = depth; detail = `Lista (${depth})`; }
                found = true;
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
                        if(i > 0) detail = `Colisões: ${i}`;
                        break;
                    }
                    item.pathQueue.push({x: pos.x + (Math.random()*10-5), y: pos.y, action: 'COLLISION'});
                    i++; cols++;
                }
            }
            if(CURRENT_MODE === 'SANDBOX') addLogEntry(item, item.finalSlotIndex, cols, `${item.id}%${TABLE_SIZE}`, detail);
            if(item.pathQueue.length > 0) { const f = item.pathQueue.shift(); item.targetX=f.x; item.targetY=f.y; }
        }
        
        draw() {
            updateLayoutMetrics();
            ctx.fillStyle = "#8be9fd"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; 
            ctx.fillText(">> ADDRESS_SPACE [RAM] // 0x00...0xFF", canvas.width / 2, SHELF_START_Y - 25);

            for(let i=0; i<TABLE_SIZE; i++) {
                const pos = getSlotScreenPos(i);
                const s = pos.size;
                ctx.fillStyle = "rgba(40, 42, 54, 0.6)"; ctx.fillRect(pos.x-s/2, pos.y-s/2, s, s);
                ctx.strokeStyle = "#bd93f9"; ctx.lineWidth = 1; 
                ctx.strokeRect(pos.x-s/2, pos.y-s/2, s, s);
                if(s > 25) { 
                    ctx.fillStyle = "#fff"; ctx.font = "12px monospace"; ctx.textAlign = "center"; 
                    ctx.fillText(i, pos.x, pos.y - s/2 - 5); 
                }
                if(GAME_MODE === 'CHAINING' && this.slots[i].length > 1) {
                     const b = this.slots[i];
                     for(let j=1; j<b.length; j++) {
                         ctx.strokeStyle = "#8be9fd"; ctx.lineWidth = 2; ctx.beginPath(); 
                         ctx.moveTo(b[j-1].x, b[j-1].y); ctx.lineTo(b[j].x, b[j].y); ctx.stroke();
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

    updateTopPanelForLab();
    updateStats();
    updateLayoutMetrics();
    loop();
});