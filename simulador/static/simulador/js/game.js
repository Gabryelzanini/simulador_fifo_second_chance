"use strict";

const foods = ["🍔", "🍕", "🥤", "🍟", "🍰", "🍨"];
const faces = ["🙂", "😊", "😄", "🤓", "😎", "🥰", "🧓", "👵"];
const OPENING_TIME_IN_MINUTES = 9 * 60;
const CLOSING_TIME_IN_MINUTES = 9 * 60;
const AFTER_SERVICE_GRACE = 6;
const TUTORIAL_STAGES = [
    { icon: "🏪", title: "A analogia do restaurante", description: "Mesas são frames, clientes são páginas e a lista representa a ordem FIFO." },
    { icon: "👥", title: "Formando a fila FIFO", description: "Três clientes ocupam as mesas. A ordem de chegada define quem será atendido primeiro." },
    { icon: "↩", title: "A segunda chance", description: "Uma mesa com novo pedido continua ocupada e volta para o final da fila." },
    { icon: "🚪", title: "Liberando uma mesa", description: "Sem novo pedido, o cliente sai e a mesa fica livre para quem está esperando." },
];

const elements = {
    restaurant: document.querySelector("#restaurant"),
    tables: [...document.querySelectorAll(".table")],
    queueList: document.querySelector("#queueList"),
    instruction: document.querySelector("#instructionText"),
    tutorialGuide: document.querySelector("#tutorialGuide"),
    tutorialStepLabel: document.querySelector("#tutorialStepLabel"),
    tutorialStepTitle: document.querySelector("#tutorialStepTitle"),
    nextTutorialButton: document.querySelector("#nextTutorialButton"),
    tutorialProgressSteps: [...document.querySelectorAll("#tutorialProgress [data-step]")],
    tutorialStageOverlay: document.querySelector("#tutorialStageOverlay"),
    tutorialStageIcon: document.querySelector("#tutorialStageIcon"),
    tutorialStageNumber: document.querySelector("#tutorialStageNumber"),
    tutorialStageCardTitle: document.querySelector("#tutorialStageCardTitle"),
    tutorialStageDescription: document.querySelector("#tutorialStageDescription"),
    startTutorialStageButton: document.querySelector("#startTutorialStageButton"),
    eventLog: document.querySelector("#eventLog"),
    resetButton: document.querySelector("#resetButton"),
    speedButton: document.querySelector("#speedButton"),
    pauseButton: document.querySelector("#pauseButton"),
    helpButton: document.querySelector("#helpButton"),
    helpDialog: document.querySelector("#helpDialog"),
    movingCustomer: document.querySelector("#movingCustomer"),
    departingCustomer: document.querySelector("#departingCustomer"),
    departingFace: document.querySelector("#departingFace"),
    speechBubble: document.querySelector("#speechBubble"),
    waiter: document.querySelector("#waiter"),
    waiterBubble: document.querySelector("#waiterBubble"),
    gameClock: document.querySelector("#gameClock"),
    periodLabel: document.querySelector("#periodLabel"),
    dayProgress: document.querySelector("#dayProgress"),
    nextArrivalText: document.querySelector("#nextArrivalText"),
    waitingCard: document.querySelector("#waitingCard"),
    waitingFace: document.querySelector("#waitingFace"),
    waitingName: document.querySelector("#waitingName"),
    secondChanceBanner: document.querySelector("#secondChanceBanner"),
    secondChanceText: document.querySelector("#secondChanceText"),
    customersStat: document.querySelector("#customersStat"),
    visitsStat: document.querySelector("#visitsStat"),
    chancesStat: document.querySelector("#chancesStat"),
    departuresStat: document.querySelector("#departuresStat"),
    maxQueueStat: document.querySelector("#maxQueueStat"),
    endDialog: document.querySelector("#endDialog"),
    newDayButton: document.querySelector("#newDayButton"),
    endCustomers: document.querySelector("#endCustomers"),
    endVisits: document.querySelector("#endVisits"),
    endChances: document.querySelector("#endChances"),
    endDepartures: document.querySelector("#endDepartures"),
    endMaxQueue: document.querySelector("#endMaxQueue"),
    technicalHistory: document.querySelector("#technicalHistory"),
    modeDialog: document.querySelector("#modeDialog"),
    tutorialModeButton: document.querySelector("#tutorialModeButton"),
    freeModeButton: document.querySelector("#freeModeButton"),
    tutorialDialog: document.querySelector("#tutorialDialog"),
    repeatTutorialButton: document.querySelector("#repeatTutorialButton"),
    continueFreeButton: document.querySelector("#continueFreeButton"),
};

let state;
let sessionNumber = 0;
let clockTimer = null;
let pendingTutorialStageAction = null;

function randomBetween(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function createInitialState() {
    sessionNumber += 1;
    return {
        session: sessionNumber,
        elapsedMinutes: 0,
        isPaused: true,
        autoPausedForCustomer: false,
        autoPausedForExplanation: false,
        autoPausedForDeparture: false,
        isClosed: false,
        speed: 1,
        mode: null,
        tables: [null, null, null],
        queue: [],
        pendingCustomer: null,
        nextCustomerId: 1,
        customerPhase: "none",
        waiterPhase: "idle",
        secondChanceTable: null,
        tutorialStage: 0,
        tutorialSubstep: 0,
        tutorialReady: false,
        tutorialTitle: "A analogia do restaurante",
        tutorialActionLabel: "Começar apresentação →",
        tutorialFocusTable: null,
        tutorialCompleted: false,
        transitions: [],
        nextArrivalAt: 5,
        nextWaiterAt: 6,
        message: "O restaurante abriu! O primeiro cliente chegará em alguns minutos.",
        events: ["09:00 — O restaurante abriu e todas as mesas estão livres."],
        stats: {
            customers: 0,
            visits: 0,
            chances: 0,
            departures: 0,
            maxQueue: 0,
        },
    };
}

function later(callback, delay) {
    const sessionAtCreation = state.session;
    window.setTimeout(() => {
        if (state.session === sessionAtCreation) callback();
    }, delay);
}

function currentClockMinutes() {
    return (OPENING_TIME_IN_MINUTES + state.elapsedMinutes) % (24 * 60);
}

function formatClock(minutes = currentClockMinutes()) {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const minutePart = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutePart}`;
}

function periodFor(minutes) {
    const hour = Math.floor(minutes / 60);
    if (hour >= 6 && hour < 12) return { key: "morning", label: "Manhã" };
    if (hour >= 12 && hour < 17) return { key: "afternoon", label: "Tarde" };
    if (hour >= 17 && hour < 19) return { key: "sunset", label: "Pôr do sol" };
    return { key: "night", label: "Noite" };
}

function addEvent(message) {
    state.events.push(`${formatClock()} — ${message}`);
    if (state.events.length > 8) state.events.shift();
}

function setMessage(message) {
    state.message = message;
    elements.instruction.textContent = message;
}

function emptyTableIndexes() {
    return state.tables
        .map((customer, index) => customer === null ? index : null)
        .filter((index) => index !== null);
}

function customerLabel(customer) {
    return `Cliente ${customer.id}`;
}

function renderClock() {
    const clockMinutes = currentClockMinutes();
    const formattedTime = formatClock(clockMinutes);
    const period = periodFor(clockMinutes);

    elements.gameClock.textContent = formattedTime;
    elements.gameClock.dateTime = formattedTime;
    elements.periodLabel.textContent = period.label;
    elements.restaurant.dataset.period = period.key;
    elements.dayProgress.style.width = `${Math.min(100, (state.elapsedMinutes / CLOSING_TIME_IN_MINUTES) * 100)}%`;
}

function renderTables() {
    const canChoose = state.customerPhase === "choosing"
        && state.pendingCustomer
        && !state.autoPausedForDeparture
        && !state.autoPausedForExplanation
        && emptyTableIndexes().length > 0;
    elements.restaurant.classList.toggle("awaiting-choice", Boolean(canChoose));
    elements.restaurant.classList.toggle(
        "tutorial-spotlight",
        state.mode === "tutorial" && state.tutorialFocusTable !== null,
    );

    elements.tables.forEach((tableElement, index) => {
        const customer = state.tables[index];
        const customerSlot = tableElement.querySelector(".customer-slot");
        const orderBubble = tableElement.querySelector(".order-bubble");
        const statusLabel = tableElement.querySelector(".table__status");

        tableElement.classList.toggle("is-empty", !customer);
        tableElement.classList.toggle("is-occupied", Boolean(customer));
        tableElement.classList.toggle("has-order", Boolean(customer?.hasOrder));
        tableElement.classList.toggle("can-select", Boolean(canChoose && !customer));
        tableElement.classList.toggle("is-next", state.waiterPhase !== "idle" && state.queue[0] === index);
        tableElement.classList.toggle(
            "tutorial-focus",
            state.mode === "tutorial" && state.tutorialFocusTable === index,
        );

        if (customer) {
            customerSlot.textContent = customer.face;
            orderBubble.textContent = customer.food || "";
            statusLabel.textContent = tableStatus(customer);
            tableElement.setAttribute(
                "aria-label",
                `Mesa ${index + 1}, ${customerLabel(customer)}${customer.hasOrder ? ", com pedido" : ", sem pedido"}`,
            );
        } else {
            customerSlot.textContent = "";
            orderBubble.textContent = "";
            statusLabel.textContent = "";
            tableElement.setAttribute("aria-label", `Mesa ${index + 1} vazia`);
        }
    });
}

function tableStatus(customer) {
    if (customer.hasOrder) return `💬 Pediu ${customer.food}`;
    if (state.elapsedMinutes < customer.protectedUntil) return "🍽️ Comendo";
    return "✅ Terminou";
}

function queueStatus(customer) {
    if (customer.hasOrder) return "Tem um pedido";
    const protectedFor = customer.protectedUntil - state.elapsedMinutes;
    if (protectedFor > 0) return `Comendo por mais ${protectedFor} min`;
    return "Sem novo pedido";
}

function renderQueue() {
    if (state.queue.length === 0) {
        elements.queueList.innerHTML = '<li class="queue-empty">Nenhuma mesa na fila</li>';
        return;
    }

    elements.queueList.innerHTML = state.queue.map((tableIndex, position) => {
        const customer = state.tables[tableIndex];
        return `
            <li class="queue-item table-color-${tableIndex + 1} ${state.secondChanceTable === tableIndex ? "just-moved" : ""} ${state.mode === "tutorial" && state.tutorialFocusTable === tableIndex ? "tutorial-focus" : ""}">
                <span class="queue-position">${position + 1}</span>
                <span>Mesa ${tableIndex + 1}<small>${queueStatus(customer)}</small></span>
            </li>
        `;
    }).join("");
}

function renderMovingCustomer() {
    const customer = state.pendingCustomer;
    const shouldShow = Boolean(customer) && ["walking", "choosing", "seating"].includes(state.customerPhase);

    elements.movingCustomer.classList.toggle("is-hidden", !shouldShow);
    if (!customer) {
        elements.speechBubble.classList.add("is-hidden");
        return;
    }

    elements.movingCustomer.querySelector(".pixel-person").textContent = customer.face;
    elements.movingCustomer.querySelector(".customer-tag").textContent = customer.id;

    const showSpeech = state.customerPhase === "choosing";
    elements.speechBubble.classList.toggle("is-hidden", !showSpeech);
    if (showSpeech) {
        elements.speechBubble.textContent = emptyTableIndexes().length
            ? "Em qual mesa vou sentar?"
            : "Vou esperar uma mesa!";
    }
}

function renderWaitingCustomer() {
    const customer = state.pendingCustomer;
    elements.waitingCard.classList.toggle("is-hidden", !customer);
    elements.waitingCard.classList.toggle(
        "tutorial-focus",
        Boolean(customer) && state.mode === "tutorial" && state.tutorialStage === 3,
    );
    if (!customer) return;

    elements.waitingFace.textContent = customer.face;
    elements.waitingName.textContent = customerLabel(customer);
}

function renderAutomationStatus() {
    if (!state.mode) {
        elements.nextArrivalText.textContent = "escolha um modo";
        elements.pauseButton.textContent = "⏸ Pausar";
        elements.pauseButton.disabled = true;
        elements.speedButton.disabled = true;
        return;
    }

    if (state.mode === "tutorial") {
        elements.nextArrivalText.textContent = "controlado pelo apresentador";
        elements.pauseButton.textContent = "🎓 Tutorial";
        elements.pauseButton.disabled = true;
        elements.speedButton.textContent = "▶ 1×";
        elements.speedButton.disabled = true;
        return;
    }

    if (state.isClosed) {
        elements.nextArrivalText.textContent = "expediente encerrado";
        elements.pauseButton.textContent = "⏹ Encerrado";
        elements.pauseButton.disabled = true;
        elements.speedButton.disabled = true;
        return;
    }

    if (state.pendingCustomer) {
        elements.nextArrivalText.textContent = "cliente esperando";
    } else {
        const arrivalDifference = Math.max(0, state.nextArrivalAt - state.elapsedMinutes);
        elements.nextArrivalText.textContent = `em ${arrivalDifference} min`;
    }

    if (state.autoPausedForDeparture) {
        elements.pauseButton.textContent = "👋 Cliente saindo";
        elements.pauseButton.disabled = true;
    } else if (state.autoPausedForExplanation) {
        elements.pauseButton.textContent = "↩ Segunda chance";
        elements.pauseButton.disabled = true;
    } else if (state.autoPausedForCustomer) {
        elements.pauseButton.textContent = "⏳ Escolha uma mesa";
        elements.pauseButton.disabled = true;
    } else {
        elements.pauseButton.textContent = state.isPaused ? "▶ Continuar" : "⏸ Pausar";
        elements.pauseButton.disabled = false;
    }
    elements.speedButton.textContent = state.speed === 1 ? "▶ 1×" : "▶▶ 2×";
    elements.speedButton.disabled = false;
}

function renderTutorialGuide() {
    const isTutorial = state.mode === "tutorial";
    elements.tutorialGuide.classList.toggle("is-hidden", !isTutorial);
    if (!isTutorial) return;

    elements.tutorialStepLabel.textContent = `ETAPA ${state.tutorialStage + 1} DE ${TUTORIAL_STAGES.length}`;
    elements.tutorialStepTitle.textContent = state.tutorialTitle;
    elements.nextTutorialButton.textContent = state.tutorialActionLabel;
    elements.nextTutorialButton.disabled = !state.tutorialReady;
    elements.tutorialProgressSteps.forEach((step, index) => {
        step.classList.toggle("is-complete", index < state.tutorialStage);
        step.classList.toggle("is-current", index === state.tutorialStage);
    });
}

function renderStats() {
    elements.customersStat.textContent = state.stats.customers;
    elements.visitsStat.textContent = state.stats.visits;
    elements.chancesStat.textContent = state.stats.chances;
    elements.departuresStat.textContent = state.stats.departures;
    elements.maxQueueStat.textContent = state.stats.maxQueue;
}

function renderEndSummary() {
    elements.endCustomers.textContent = state.stats.customers;
    elements.endVisits.textContent = state.stats.visits;
    elements.endChances.textContent = state.stats.chances;
    elements.endDepartures.textContent = state.stats.departures;
    elements.endMaxQueue.textContent = state.stats.maxQueue;
}

function renderTechnicalHistory() {
    if (!state.transitions.length) {
        elements.technicalHistory.innerHTML = '<tr><td colspan="4">O garçom ainda não atendeu nenhuma mesa.</td></tr>';
        return;
    }

    elements.technicalHistory.innerHTML = state.transitions.map((transition) => `
        <tr>
            <td>${transition.time}</td>
            <td>${transition.before}</td>
            <td>${transition.decision}</td>
            <td>${transition.after}</td>
        </tr>
    `).join("");
}

function renderEvents() {
    elements.eventLog.innerHTML = state.events.map((event) => `<li>${event}</li>`).join("");
    elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function render() {
    renderClock();
    renderTables();
    renderQueue();
    renderMovingCustomer();
    renderWaitingCustomer();
    renderAutomationStatus();
    renderTutorialGuide();
    renderStats();
    renderEndSummary();
    renderTechnicalHistory();
    renderEvents();
    elements.instruction.textContent = state.message;
}

function receiveCustomer() {
    if (state.pendingCustomer) return;

    const id = state.nextCustomerId;
    state.nextCustomerId += 1;
    state.stats.customers += 1;
    state.pendingCustomer = {
        id,
        face: faces[(id - 1) % faces.length],
    };
    state.customerPhase = "walking";
    if (emptyTableIndexes().length > 0) {
        state.isPaused = true;
        state.autoPausedForCustomer = true;
    }
    setMessage(`O Cliente ${id} entrou e está caminhando até o caixa.`);
    addEvent(`O Cliente ${id} chegou ao restaurante.`);

    elements.movingCustomer.className = "moving-customer at-entrance";
    render();

    later(() => {
        elements.movingCustomer.className = "moving-customer at-cashier";
    }, 80);

    later(() => {
        state.customerPhase = "choosing";
        if (emptyTableIndexes().length) {
            setMessage(`O tempo está pausado. Escolha uma mesa vazia para o Cliente ${id}.`);
        } else {
            setMessage(`O Cliente ${id} está esperando. O relógio continuará até uma mesa ficar livre.`);
        }
        render();
    }, 1050);
}

function seatPendingCustomer(tableIndex) {
    const customer = state.pendingCustomer;
    if (!customer || state.tables[tableIndex] || state.customerPhase !== "choosing") return;

    state.customerPhase = "seating";
    setMessage(`${customerLabel(customer)} está caminhando até a Mesa ${tableIndex + 1}.`);
    elements.speechBubble.classList.add("is-hidden");
    elements.movingCustomer.className = `moving-customer to-table-${tableIndex + 1}`;

    later(() => {
        state.tables[tableIndex] = {
            ...customer,
            hasOrder: false,
            food: null,
            seatedAt: state.elapsedMinutes,
            protectedUntil: state.elapsedMinutes + (state.mode === "tutorial" ? 10 : randomBetween(15, 20)),
            nextOrderAt: state.elapsedMinutes + randomBetween(4, 7),
        };
        state.queue.push(tableIndex);
        state.stats.maxQueue = Math.max(state.stats.maxQueue, state.queue.length);
        state.pendingCustomer = null;
        state.customerPhase = "none";
        if (state.autoPausedForCustomer) {
            state.autoPausedForCustomer = false;
            state.isPaused = state.mode === "tutorial";
        }
        elements.movingCustomer.className = "moving-customer is-hidden at-entrance";
        setMessage(`A Mesa ${tableIndex + 1} entrou no final da fila e o relógio voltou a andar.`);
        addEvent(`${customerLabel(customer)} sentou na Mesa ${tableIndex + 1}.`);
        render();
        handleTutorialSeatCompletion();
    }, 950);
}

function generateDueOrders() {
    const newOrderTables = [];

    state.tables.forEach((customer, tableIndex) => {
        if (!customer || customer.hasOrder || state.elapsedMinutes < customer.nextOrderAt) return;

        if (Math.random() < 0.65) {
            customer.hasOrder = true;
            customer.food = foods[Math.floor(Math.random() * foods.length)];
            newOrderTables.push(tableIndex + 1);
        } else {
            customer.nextOrderAt = state.elapsedMinutes + randomBetween(3, 7);
        }
    });

    if (newOrderTables.length) {
        const list = newOrderTables.map((number) => `Mesa ${number}`).join(", ");
        setMessage(`${list} ${newOrderTables.length === 1 ? "fez um novo pedido" : "fizeram novos pedidos"}!`);
        addEvent(`Novos pedidos apareceram: ${list}.`);
    }
}

function startWaiterVisit(tableIndex) {
    const customer = state.tables[tableIndex];
    if (!customer) return;

    state.waiterPhase = "walking";
    state.nextWaiterAt = state.elapsedMinutes + randomBetween(4, 6);
    elements.waiter.className = `waiter at-table-${tableIndex + 1}`;
    elements.waiterBubble.textContent = customer.hasOrder ? "Já trago seu pedido!" : "Terminou a refeição?";
    elements.waiterBubble.classList.remove("is-hidden");
    setMessage(`O garçom está atendendo a primeira da fila: Mesa ${tableIndex + 1}.`);
    render();

    later(() => finishInspection(tableIndex), 900);
}

function formatQueue(queue) {
    return queue.length ? queue.map((index) => `M${index + 1}`).join(" → ") : "vazia";
}

function animateDeparture(customer, tableIndex) {
    state.isPaused = true;
    state.autoPausedForDeparture = true;
    elements.departingFace.textContent = customer.face;
    elements.departingCustomer.className = `departing-customer from-table-${tableIndex + 1}`;

    later(() => {
        elements.departingCustomer.className = "departing-customer to-exit";
    }, 80);

    later(() => {
        elements.departingCustomer.className = "departing-customer is-hidden";
        state.autoPausedForDeparture = false;
        if (state.pendingCustomer) {
            state.autoPausedForCustomer = true;
            state.isPaused = true;
            setMessage("O cliente saiu pela porta. Agora escolha qualquer mesa vazia para quem está esperando.");
        } else {
            state.isPaused = false;
            setMessage(`O cliente da Mesa ${tableIndex + 1} saiu pela porta e a mesa está livre.`);
        }
        render();
    }, 1800);
}

function finishInspection(tableIndex) {
    const customer = state.tables[tableIndex];
    if (!customer || state.queue[0] !== tableIndex) {
        state.waiterPhase = "idle";
        render();
        return;
    }

    const beforeQueue = formatQueue(state.queue);
    let decision;
    state.queue.shift();
    if (customer.hasOrder) {
        customer.hasOrder = false;
        customer.food = null;
        customer.protectedUntil = state.elapsedMinutes + AFTER_SERVICE_GRACE;
        customer.nextOrderAt = state.elapsedMinutes + randomBetween(4, 9);
        state.queue.push(tableIndex);
        state.stats.chances += 1;
        decision = `Mesa ${tableIndex + 1}: segunda chance`;
        state.secondChanceTable = tableIndex;
        state.isPaused = true;
        state.autoPausedForExplanation = true;
        elements.secondChanceText.textContent = `A Mesa ${tableIndex + 1} foi para o final da fila.`;
        elements.secondChanceBanner.classList.toggle("tutorial-persistent", state.mode === "tutorial");
        elements.secondChanceBanner.classList.remove("is-hidden");
        setMessage(`A Mesa ${tableIndex + 1} foi atendida, ganhou uma segunda chance e foi para o final da fila.`);
        addEvent(`Mesa ${tableIndex + 1}: pedido atendido e segunda chance recebida.`);

        if (state.mode === "tutorial") {
            state.tutorialSubstep = 1;
            state.tutorialReady = true;
            state.tutorialTitle = "Segunda chance aplicada";
            state.tutorialActionLabel = "Continuar para a substituição →";
        } else {
            later(() => {
                if (state.secondChanceTable !== tableIndex) return;
                state.secondChanceTable = null;
                state.autoPausedForExplanation = false;
                if (!state.autoPausedForCustomer && !state.autoPausedForDeparture) state.isPaused = false;
                elements.secondChanceBanner.classList.add("is-hidden");
                render();
            }, 3800);
        }
    } else {
        animateDeparture(customer, tableIndex);
        state.tables[tableIndex] = null;
        state.stats.departures += 1;
        decision = `Mesa ${tableIndex + 1}: liberada`;
        setMessage(`O cliente da Mesa ${tableIndex + 1} pagou a conta e está caminhando até a saída.`);
        addEvent(`Mesa ${tableIndex + 1}: o cliente pagou a conta e começou a sair.`);
    }

    state.stats.visits += 1;
    state.transitions.push({
        time: formatClock(),
        before: beforeQueue,
        decision,
        after: formatQueue(state.queue),
    });
    if (state.transitions.length > 12) state.transitions.shift();

    state.waiterPhase = "idle";
    elements.waiter.className = "waiter";
    elements.waiterBubble.classList.add("is-hidden");
    render();
}

function processAutomaticEvents() {
    if (state.isClosed) return;
    if (state.mode === "tutorial") {
        return;
    }
    generateDueOrders();

    if (state.elapsedMinutes >= state.nextArrivalAt) {
        if (!state.pendingCustomer) {
            receiveCustomer();
            state.nextArrivalAt = state.elapsedMinutes + randomBetween(10, 15);
        } else {
            state.nextArrivalAt = state.elapsedMinutes + 2;
        }
    }

    if (state.elapsedMinutes < state.nextWaiterAt || state.waiterPhase !== "idle") return;

    if (!state.queue.length) {
        state.nextWaiterAt = state.elapsedMinutes + 3;
        return;
    }

    const nextTable = state.queue[0];
    const customer = state.tables[nextTable];
    if (!customer) {
        state.queue.shift();
        state.nextWaiterAt = state.elapsedMinutes + 1;
        return;
    }

    if (state.elapsedMinutes < customer.protectedUntil) {
        state.nextWaiterAt = Math.min(customer.protectedUntil, state.elapsedMinutes + 2);
        return;
    }

    startWaiterVisit(nextTable);
}

function advanceClock() {
    if (state.isPaused || state.isClosed) return;

    state.elapsedMinutes += 1;
    if (state.elapsedMinutes >= CLOSING_TIME_IN_MINUTES) {
        closeRestaurant();
    } else {
        processAutomaticEvents();
    }
    render();
}

function restartClockTimer() {
    if (clockTimer !== null) window.clearInterval(clockTimer);
    const tickDuration = 1000 / state.speed;
    clockTimer = window.setInterval(advanceClock, tickDuration);
}

function closeRestaurant() {
    if (state.isClosed) return;
    state.isClosed = true;
    state.isPaused = true;
    setMessage("O expediente terminou! Veja como o FIFO Second Chance se comportou durante o dia.");
    addEvent("O restaurante encerrou o expediente.");
    render();
    if (!elements.endDialog.open) elements.endDialog.showModal();
}

function markTableTemporarily(tableElement) {
    tableElement.classList.remove("is-wrong");
    void tableElement.offsetWidth;
    tableElement.classList.add("is-wrong");
}

function handleTableClick(event) {
    if (state.customerPhase !== "choosing"
        || !state.pendingCustomer
        || state.autoPausedForDeparture
        || state.autoPausedForExplanation) return;

    const tableIndex = Number(event.currentTarget.dataset.table);
    if (state.tables[tableIndex]) {
        setMessage(`A Mesa ${tableIndex + 1} já está ocupada. Escolha uma mesa vazia.`);
        markTableTemporarily(event.currentTarget);
        return;
    }
    seatPendingCustomer(tableIndex);
}

function handleTutorialSeatCompletion() {
    if (state.mode !== "tutorial") return;

    if (state.tutorialStage === 1) {
        if (state.stats.customers < 3) {
            state.tutorialReady = false;
            state.tutorialTitle = `Formando a fila (${state.stats.customers}/3)`;
            state.tutorialActionLabel = "Próximo cliente chegando...";
            render();
            later(() => {
                state.elapsedMinutes += 5;
                receiveCustomer();
                render();
            }, 650);
            return;
        }

        state.tutorialReady = true;
        state.tutorialTitle = "Fila FIFO formada";
        state.tutorialActionLabel = "Mostrar a segunda chance →";
        state.tutorialFocusTable = state.queue[0];
        setMessage("As três mesas estão ocupadas. A primeira mesa da lista chegou primeiro, então o garçom vai atendê-la primeiro.");
        render();
        return;
    }

    if (state.tutorialStage === 3 && state.stats.departures >= 1 && state.stats.customers >= 4) {
        state.tutorialSubstep = 1;
        state.tutorialReady = true;
        state.tutorialTitle = "Nova mesa ocupada";
        state.tutorialActionLabel = "Concluir tutorial ✓";
        state.tutorialFocusTable = null;
        setMessage("O cliente que esperava sentou na mesa livre. No computador, uma nova página ocupou o frame liberado.");
        render();
    }
}

function startFormationStage() {
    state.tutorialStage = 1;
    state.tutorialSubstep = 0;
    state.tutorialReady = false;
    state.tutorialTitle = "Formando a fila (0/3)";
    state.tutorialActionLabel = "Acomode os clientes nas mesas";
    state.tutorialFocusTable = null;
    state.elapsedMinutes = 2;
    setMessage("Etapa 2: três clientes chegam e ocupam as mesas. A ordem de chegada forma a fila FIFO.");
    receiveCustomer();
    render();
}

function enterSecondChanceStage() {
    const firstTable = state.queue[0];
    const customer = state.tables[firstTable];
    if (!customer) return;

    state.tutorialStage = 2;
    state.tutorialSubstep = 0;
    state.tutorialReady = true;
    state.tutorialTitle = "Pedido na primeira mesa";
    state.tutorialActionLabel = "Ver o garçom agir →";
    state.tutorialFocusTable = firstTable;
    state.elapsedMinutes = 16;
    customer.hasOrder = true;
    customer.food = "🍕";
    customer.protectedUntil = state.elapsedMinutes;
    setMessage(`A Mesa ${firstTable + 1} está no início da fila e fez um novo pedido. Por isso, ela pode receber uma segunda chance.`);
    addEvent(`Tutorial: a primeira mesa da fila fez um pedido.`);
    render();
}

function runSecondChance() {
    state.tutorialReady = false;
    state.tutorialActionLabel = "O garçom está atendendo...";
    startWaiterVisit(state.queue[0]);
    render();
}

function enterSubstitutionStage() {
    state.secondChanceTable = null;
    state.autoPausedForExplanation = false;
    elements.secondChanceBanner.classList.add("is-hidden");
    elements.secondChanceBanner.classList.remove("tutorial-persistent");
    state.tutorialStage = 3;
    state.tutorialSubstep = 0;
    state.tutorialReady = false;
    state.tutorialTitle = "Cliente aguardando uma mesa";
    state.tutorialActionLabel = "Cliente chegando...";
    state.tutorialFocusTable = null;
    state.elapsedMinutes = 22;
    state.isPaused = true;
    setMessage("Etapa 4: um quarto cliente chega, mas todas as mesas estão ocupadas.");
    receiveCustomer();
    render();

    later(() => {
        const firstTable = state.queue[0];
        const customer = state.tables[firstTable];
        if (customer) {
            customer.hasOrder = false;
            customer.food = null;
            customer.protectedUntil = state.elapsedMinutes;
        }
        state.tutorialFocusTable = firstTable;
        state.tutorialReady = true;
        state.tutorialTitle = "Mesa sem novo pedido";
        state.tutorialActionLabel = "Ver o cliente sair →";
        setMessage(`A Mesa ${firstTable + 1} está no início da fila e não fez outro pedido. Sem uma segunda chance, ela será liberada.`);
        render();
    }, 1250);
}

function runSubstitution() {
    state.tutorialReady = false;
    state.tutorialActionLabel = "O cliente está saindo...";
    startWaiterVisit(state.queue[0]);
    render();
}

function completeTutorial() {
    state.tutorialCompleted = true;
    state.tutorialReady = false;
    setMessage("Obrigado pela atenção! A apresentação do FIFO Second Chance foi concluída.");
    render();
    if (!elements.tutorialDialog.open) elements.tutorialDialog.showModal();
}

function showTutorialStageIntro(stageIndex, startAction = null) {
    const stage = TUTORIAL_STAGES[stageIndex];
    pendingTutorialStageAction = startAction;
    elements.tutorialStageOverlay.dataset.stage = String(stageIndex);
    elements.tutorialStageIcon.textContent = stage.icon;
    elements.tutorialStageNumber.textContent = `ETAPA ${stageIndex + 1} DE ${TUTORIAL_STAGES.length}`;
    elements.tutorialStageCardTitle.textContent = stage.title;
    elements.tutorialStageDescription.textContent = stage.description;
    elements.nextTutorialButton.disabled = true;
    elements.tutorialStageOverlay.classList.remove("is-hidden");
}

function startTutorialStageFromCard() {
    elements.tutorialStageOverlay.classList.add("is-hidden");
    const startAction = pendingTutorialStageAction;
    pendingTutorialStageAction = null;
    if (startAction) startAction();
    else render();
}

function nextTutorialStep() {
    if (state.mode !== "tutorial" || !state.tutorialReady) return;

    if (state.tutorialStage === 0) showTutorialStageIntro(1, startFormationStage);
    else if (state.tutorialStage === 1) showTutorialStageIntro(2, enterSecondChanceStage);
    else if (state.tutorialStage === 2 && state.tutorialSubstep === 0) runSecondChance();
    else if (state.tutorialStage === 2) showTutorialStageIntro(3, enterSubstitutionStage);
    else if (state.tutorialStage === 3 && state.tutorialSubstep === 0) runSubstitution();
    else if (state.tutorialStage === 3) completeTutorial();
}

function selectMode(mode) {
    state.mode = mode;
    state.isPaused = mode === "tutorial";
    state.autoPausedForCustomer = false;
    state.autoPausedForExplanation = false;
    state.autoPausedForDeparture = false;
    state.nextArrivalAt = mode === "tutorial" ? CLOSING_TIME_IN_MINUTES : 5;
    state.tutorialStage = 0;
    state.tutorialSubstep = 0;
    state.tutorialReady = mode === "tutorial";
    state.tutorialTitle = "A analogia do restaurante";
    state.tutorialActionLabel = "Começar apresentação →";
    setMessage(
        mode === "tutorial"
            ? "Etapa 1: apresentando a analogia — mesas são frames, clientes são páginas e a lista representa o FIFO."
            : "Modo livre iniciado: o primeiro cliente chegará em alguns minutos.",
    );
    if (elements.modeDialog.open) elements.modeDialog.close();
    render();
    if (mode === "tutorial") showTutorialStageIntro(0);
}

function continueInFreeMode() {
    if (elements.tutorialDialog.open) elements.tutorialDialog.close();
    state.mode = "free";
    state.isPaused = false;
    state.autoPausedForCustomer = false;
    state.autoPausedForExplanation = false;
    state.autoPausedForDeparture = false;
    state.nextArrivalAt = state.elapsedMinutes + randomBetween(10, 15);
    state.nextWaiterAt = state.elapsedMinutes + randomBetween(4, 6);
    pendingTutorialStageAction = null;
    elements.tutorialStageOverlay.classList.add("is-hidden");
    setMessage("Agora o restaurante continuará no modo livre, com acontecimentos aleatórios.");
    render();
}

function repeatTutorial() {
    if (elements.tutorialDialog.open) elements.tutorialDialog.close();
    resetGame(false);
    selectMode("tutorial");
}

function togglePause() {
    if (!state.mode
        || state.mode === "tutorial"
        || state.isClosed
        || state.autoPausedForCustomer
        || state.autoPausedForExplanation
        || state.autoPausedForDeparture) return;
    state.isPaused = !state.isPaused;
    setMessage(
        state.isPaused
            ? "O tempo está pausado."
            : "O relógio voltou a andar. O restaurante está em movimento!",
    );
    render();
}

function toggleSpeed() {
    if (!state.mode || state.mode === "tutorial" || state.isClosed) return;
    state.speed = state.speed === 1 ? 2 : 1;
    restartClockTimer();
    setMessage(`Velocidade alterada para ${state.speed}×.`);
    render();
}

function resetGame(showModeSelector = true) {
    if (elements.endDialog.open) elements.endDialog.close();
    if (elements.tutorialDialog.open) elements.tutorialDialog.close();
    if (elements.modeDialog.open) elements.modeDialog.close();
    pendingTutorialStageAction = null;
    elements.tutorialStageOverlay.classList.add("is-hidden");
    state = createInitialState();
    elements.movingCustomer.className = "moving-customer is-hidden at-entrance";
    elements.departingCustomer.className = "departing-customer is-hidden";
    elements.waiter.className = "waiter";
    elements.waiterBubble.classList.add("is-hidden");
    elements.speechBubble.classList.add("is-hidden");
    elements.secondChanceBanner.classList.add("is-hidden");
    elements.secondChanceBanner.classList.remove("tutorial-persistent");
    render();
    restartClockTimer();
    if (showModeSelector) elements.modeDialog.showModal();
}

elements.speedButton.addEventListener("click", toggleSpeed);
elements.pauseButton.addEventListener("click", togglePause);
elements.resetButton.addEventListener("click", () => resetGame());
elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
elements.newDayButton.addEventListener("click", () => resetGame());
elements.tutorialModeButton.addEventListener("click", () => selectMode("tutorial"));
elements.freeModeButton.addEventListener("click", () => selectMode("free"));
elements.repeatTutorialButton.addEventListener("click", repeatTutorial);
elements.continueFreeButton.addEventListener("click", continueInFreeMode);
elements.nextTutorialButton.addEventListener("click", nextTutorialStep);
elements.startTutorialStageButton.addEventListener("click", startTutorialStageFromCard);
elements.tables.forEach((table) => table.addEventListener("click", handleTableClick));
elements.modeDialog.addEventListener("cancel", (event) => event.preventDefault());
document.addEventListener("keydown", (event) => {
    if (event.code !== "Space"
        || state.mode !== "tutorial"
        || elements.modeDialog.open
        || elements.helpDialog.open
        || elements.tutorialDialog.open
        || event.target instanceof HTMLButtonElement) return;

    if (!elements.tutorialStageOverlay.classList.contains("is-hidden")) {
        event.preventDefault();
        startTutorialStageFromCard();
        return;
    }

    if (!state.tutorialReady) return;
    event.preventDefault();
    nextTutorialStep();
});

resetGame();
