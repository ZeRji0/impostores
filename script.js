// Variables globales de configuración y estado del juego
let players = [];
let scores = [];
let numPlayers = 0;
let impostorCountFixed = 1;
let useRandomImpostors = false;
let wordMode = "custom";
let customWords = [];
let localWords = [
  "Manzana", "Avión", "Elefante", "Casa", "Guitarra",
  "Montaña", "Chocolate", "Universo", "Coche", "Película",
  "Río", "Amor", "Ordenador", "Libro", "Fantasma",
  "Desierto", "Bosque", "Mariposa", "Sol", "Estrella",
  "Océano", "Planeta", "Caballo", "Rey", "Silla",
  "Ventana", "Luna", "Dragón", "Flor", "Amigo"
];
let currentRound = 1;
let currentPlayerIndex = 0;
let roles = [];          // Roles asignados a cada jugador (palabra secreta o "Eres el impostor 👀")
let secretWord = "";     // Palabra secreta de la ronda actual
let coopWordGiverIndex = 0; // Índice del jugador que dará la palabra en modo cooperativo

// Referencias a elementos del DOM
const numPlayersInput = document.getElementById("numPlayers");
const playersContainer = document.getElementById("playersContainer");
const numImpostorsInput = document.getElementById("numImpostors");
const randomImpostorsChk = document.getElementById("randomImpostorsChk");
const wordModeRadios = document.getElementsByName("wordMode");
const customListField = document.getElementById("customListField");
const customWordListTextarea = document.getElementById("customWordList");
const startGameBtn = document.getElementById("startGameBtn");

const coopWordSection = document.getElementById("coopWordSection");
const coopPrompt = document.getElementById("coopPrompt");
const coopWordInput = document.getElementById("coopWordInput");
const confirmWordBtn = document.getElementById("confirmWordBtn");

const revealSection = document.getElementById("revealSection");
const currentPlayerPrompt = document.getElementById("currentPlayerPrompt");
const roleDisplay = document.getElementById("roleDisplay");
const roleText = document.getElementById("roleText");
const showRoleBtn = document.getElementById("showRoleBtn");
const hideRoleBtn = document.getElementById("hideRoleBtn");
const nextPlayerBtn = document.getElementById("nextPlayerBtn");

const scoreSection = document.getElementById("scoreSection");
const scoreHeader = document.getElementById("scoreHeader");
const scoreList = document.getElementById("scoreList");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const resetGameBtn = document.getElementById("resetGameBtn");

// Inicializar campos de nombres según número de jugadores
function updatePlayerFields(count) {
  const currentCount = playersContainer.children.length;
  if (count > currentCount) {
    // Agregar campos de nombre
    for (let i = currentCount + 1; i <= count; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Nombre del jugador ${i}`;
      playersContainer.appendChild(input);
    }
  } else if (count < currentCount) {
    // Remover campos sobrantes
    for (let i = currentCount; i > count; i--) {
      playersContainer.removeChild(playersContainer.lastElementChild);
    }
  }
}
// Evento al cambiar el número de jugadores
numPlayersInput.addEventListener("input", () => {
  let count = parseInt(numPlayersInput.value, 10);
  if (isNaN(count) || count < 3) {
    count = 3;
  }
  if (count > 20) count = 20;
  numPlayersInput.value = count;
  updatePlayerFields(count);
});

// Evento para alternar campo de número de impostores fijo o aleatorio
randomImpostorsChk.addEventListener("change", () => {
  if (randomImpostorsChk.checked) {
    numImpostorsInput.disabled = true;
  } else {
    numImpostorsInput.disabled = false;
  }
});

// Evento para alternar campo de lista personalizada según modo de palabra
for (let radio of wordModeRadios) {
  radio.addEventListener("change", () => {
    if (radio.checked && radio.value === "custom") {
      customListField.style.display = "block";
    } else if (radio.checked) {
      customListField.style.display = "none";
    }
  });
}

// Función para inicializar el juego con la configuración dada
async function startGame() {
  // Obtener configuración de jugadores y nombres
  numPlayers = parseInt(numPlayersInput.value, 10);
  if (isNaN(numPlayers) || numPlayers < 3) {
    numPlayers = 3;
  }
  players = [];
  const nameInputs = playersContainer.getElementsByTagName("input");
  for (let i = 0; i < numPlayers; i++) {
    let name = nameInputs[i]?.value.trim();
    if (!name) {
      name = "Jugador " + (i + 1);
    }
    players.push(name);
  }
  // Inicializar puntuaciones
  scores = new Array(numPlayers).fill(0);

  // Configuración de impostores
  useRandomImpostors = randomImpostorsChk.checked;
  impostorCountFixed = parseInt(numImpostorsInput.value, 10);
  if (isNaN(impostorCountFixed) || impostorCountFixed < 1) {
    impostorCountFixed = 1;
  }

  // Modo de palabra seleccionado
  for (let radio of wordModeRadios) {
    if (radio.checked) {
      wordMode = radio.value;
      break;
    }
  }
  // Preparar lista personalizada si aplica
  if (wordMode === "custom") {
    const text = customWordListTextarea.value.trim();
    if (text.length > 0) {
      // Separar por comas o nuevas líneas
      customWords = text.split(/[\n,]+/).map(w => w.trim()).filter(w => w);
    } else {
      customWords = [];
    }
    if (customWords.length === 0) {
      // Si no hay palabras personalizadas proporcionadas, cambiar a banco local por defecto
      wordMode = "local";
    }
  }

  currentRound = 1;
  // Construir interfaz de marcador inicial
  buildScoreboard();

  // Ocultar sección de configuración y mostrar sección correspondiente según modo
  configSection.style.display = "none";
  if (wordMode === "coop") {
    // Modo cooperativo: solicitar palabra al primer jugador
    coopWordGiverIndex = 0;
    showCoopWordInput();
  } else {
    // Otros modos: iniciar ronda inmediatamente
    await startRound();
  }
}

// Función para mostrar la interfaz de introducir palabra en modo cooperativo
function showCoopWordInput() {
  // Mostrar la sección para que el jugador coopWordGiverIndex introduzca la palabra
  const giverName = players[coopWordGiverIndex];
  coopPrompt.textContent = `Turno de ${giverName}: introduce una palabra secreta (los demás, no miren)`;
  coopWordInput.value = "";
  coopWordSection.style.display = "block";
  revealSection.style.display = "none";
  scoreSection.style.display = "none";
}

// Función para iniciar una nueva ronda (asignar palabra secreta y roles)
async function startRound() {
  // Obtener palabra secreta según el modo
  if (wordMode === "custom") {
    // Elegir palabra aleatoria de la lista personalizada
    const randomIndex = Math.floor(Math.random() * customWords.length);
    secretWord = customWords[randomIndex];
  } else if (wordMode === "api") {
    // Obtener palabra aleatoria desde API (modo asíncrono)
    try {
      const res = await fetch("https://random-word-api.herokuapp.com/word?lang=es&number=1");
      const data = await res.json();
      if (data && data[0]) {
        secretWord = data[0];
      } else {
        // Fallback si la respuesta no es válida
        throw new Error("API sin respuesta");
      }
    } catch (error) {
      // En caso de fallo, usar palabra local aleatoria
      const randIdx = Math.floor(Math.random() * localWords.length);
      secretWord = localWords[randIdx];
    }
  } else if (wordMode === "local") {
    // Elegir palabra aleatoria de la lista local
    const randIdx = Math.floor(Math.random() * localWords.length);
    secretWord = localWords[randIdx];
  } else if (wordMode === "coop") {
    // En cooperativo, la palabra ya está establecida por el jugador (en confirmWordBtn)
    // secretWord ya debería estar asignada antes de llamar a startRound en cooperativo.
  }

  // Asignar roles (palabra o impostor) a cada jugador
  roles = new Array(numPlayers);
  // Determinar cuántos impostores habrá esta ronda
  let impostorCount = impostorCountFixed;
  if (useRandomImpostors) {
    if (numPlayers < 4) {
      impostorCount = 1;
    } else {
      impostorCount = (Math.random() < 0.5 ? 1 : 2);
      // Opcional: asegurar que no exceda numPlayers - 1
      if (impostorCount > numPlayers - 1) impostorCount = numPlayers - 1;
    }
  } else {
    // Asegurar que impostorCount no supere el máximo lógico
    if (impostorCount > numPlayers - 1) {
      impostorCount = numPlayers - 1;
    }
    if (impostorCount < 1) impostorCount = 1;
  }

  // Seleccionar impostores aleatoriamente
  let impostorIndices = [];
  if (wordMode === "coop") {
    // Excluir al jugador que ingresó la palabra (coopWordGiverIndex) de la lista de candidatos a impostor
    let candidates = [];
    for (let i = 0; i < numPlayers; i++) {
      if (i !== coopWordGiverIndex) candidates.push(i);
    }
    // Asegurar que impostorCount no sea mayor que candidatos disponibles
    if (impostorCount > candidates.length) {
      impostorCount = candidates.length;
    }
    // Elegir impostores de los candidatos
    while (impostorIndices.length < impostorCount) {
      const rand = Math.floor(Math.random() * candidates.length);
      const idx = candidates[rand];
      if (!impostorIndices.includes(idx)) {
        impostorIndices.push(idx);
      }
    }
  } else {
    // Modo normal (no cooperativo): todos pueden ser impostor
    while (impostorIndices.length < impostorCount) {
      const rand = Math.floor(Math.random() * numPlayers);
      if (!impostorIndices.includes(rand)) {
        impostorIndices.push(rand);
      }
    }
  }

  // Asignar roles según impostores seleccionados
  for (let i = 0; i < numPlayers; i++) {
    if (impostorIndices.includes(i)) {
      roles[i] = "Eres el impostor 👀";
    } else {
      roles[i] = secretWord;
    }
  }
  
  // Iniciar la fase de revelación de roles para el primer jugador
  currentPlayerIndex = 0;
  showRoleRevealUI();
}

// Mostrar la interfaz de revelación de rol para currentPlayerIndex
function showRoleRevealUI() {
  // Ocultar otras secciones, mostrar la de revelación
  coopWordSection.style.display = "none";
  revealSection.style.display = "block";
  scoreSection.style.display = "none";
  // Actualizar el mensaje con el nombre del jugador actual
  currentPlayerPrompt.textContent = `Turno de ${players[currentPlayerIndex]}`;
  // Resetear visibilidad de botones y texto de rol
  roleDisplay.style.display = "none";
  roleText.textContent = "";
  showRoleBtn.style.display = "inline-block";
  hideRoleBtn.style.display = "none";
  nextPlayerBtn.disabled = true;
}

// Construir el marcador inicial en la interfaz
function buildScoreboard() {
  scoreList.innerHTML = "";
  for (let i = 0; i < players.length; i++) {
    const li = document.createElement("li");
    li.className = "score-item";
    // Nombre del jugador
    const nameSpan = document.createElement("span");
    nameSpan.className = "playerName";
    nameSpan.textContent = players[i];
    // Controles de puntuación
    const controlsSpan = document.createElement("span");
    controlsSpan.className = "score-controls";
    const minusBtn = document.createElement("button");
    minusBtn.className = "score-btn minus";
    minusBtn.textContent = "−";
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "score";
    scoreSpan.textContent = scores[i];
    const plusBtn = document.createElement("button");
    plusBtn.className = "score-btn plus";
    plusBtn.textContent = "+";
    // Asociar índice de jugador a los botones
    minusBtn.dataset.idx = i;
    plusBtn.dataset.idx = i;
    // Deshabilitar minus si puntuación 0
    minusBtn.disabled = (scores[i] <= 0);
    // Eventos para ajustar puntuaciones
    minusBtn.addEventListener("click", () => {
      const idx = parseInt(minusBtn.dataset.idx);
      if (scores[idx] > 0) {
        scores[idx]--;
        scoreSpan.textContent = scores[idx];
        if (scores[idx] <= 0) {
          minusBtn.disabled = true;
        }
      }
    });
    plusBtn.addEventListener("click", () => {
      const idx = parseInt(plusBtn.dataset.idx);
      scores[idx]++;
      scoreSpan.textContent = scores[idx];
      // Habilitar el botón de restar porque ahora hay al menos 1 punto
      if (scores[idx] > 0) {
        const minus = controlsSpan.querySelector("button.minus");
        minus.disabled = false;
      }
    });
    // Construir elementos
    controlsSpan.appendChild(minusBtn);
    controlsSpan.appendChild(scoreSpan);
    controlsSpan.appendChild(plusBtn);
    li.appendChild(nameSpan);
    li.appendChild(controlsSpan);
    scoreList.appendChild(li);
  }
  // Actualizar encabezado de marcador con número de ronda
  scoreHeader.textContent = `Marcador - Ronda ${currentRound}`;
}

// Eventos para botones de la fase de juego
showRoleBtn.addEventListener("click", () => {
  // Mostrar el rol del jugador actual
  roleText.textContent = roles[currentPlayerIndex];
  roleDisplay.style.display = "block";
  showRoleBtn.style.display = "none";
  hideRoleBtn.style.display = "inline-block";
  nextPlayerBtn.disabled = true; // asegurar que siga deshabilitado mientras el rol está visible
});
hideRoleBtn.addEventListener("click", () => {
  // Ocultar el rol (texto) nuevamente
  roleDisplay.style.display = "none";
  hideRoleBtn.style.display = "none";
  // Habilitar el botón de siguiente jugador
  nextPlayerBtn.disabled = false;
  // Si es el último jugador, opcionalmente se puede continuar automáticamente
  if (currentPlayerIndex === numPlayers - 1) {
    // Último jugador ocultó su rol: mostrar marcador y opciones de ronda
    revealSection.style.display = "none";
    showScoreboard();
  }
});
nextPlayerBtn.addEventListener("click", () => {
  if (currentPlayerIndex < numPlayers - 1) {
    // Pasar al siguiente jugador
    currentPlayerIndex++;
    showRoleRevealUI();
  }
});

// Mostrar la sección de marcador al terminar revelación de todos los roles
function showScoreboard() {
  // Actualizar (o recalcular) marcador visual
  // (En este caso, las puntuaciones se actualizan manualmente durante la discusión)
  scoreSection.style.display = "block";
  revealSection.style.display = "none";
  coopWordSection.style.display = "none";
  // Asegurar que la cabecera del marcador indica la ronda actual
  scoreHeader.textContent = `Marcador - Ronda ${currentRound}`;
}

// Botón confirmar palabra en cooperativo
confirmWordBtn.addEventListener("click", async () => {
  const word = coopWordInput.value.trim();
  if (word === "") {
    return; // no hacer nada si no hay palabra
  }
  // Asignar la palabra secreta ingresada
  secretWord = word;
  // Iniciar la ronda con la palabra proporcionada
  await startRound();
});

// Botón siguiente ronda
nextRoundBtn.addEventListener("click", () => {
  // Incrementar el contador de rondas
  currentRound++;
  // En modo cooperativo, avanzar el turno del que dará la palabra
  if (wordMode === "coop") {
    coopWordGiverIndex = (coopWordGiverIndex + 1) % numPlayers;
    // Mostrar interfaz de entrada de palabra para el siguiente jugador
    showCoopWordInput();
  } else {
    // Para otros modos, iniciar una nueva ronda directamente
    startRound();
  }
  // Ocultar el marcador durante la distribución de roles de la nueva ronda
  scoreSection.style.display = "none";
});

// Botón nueva partida (reset total)
resetGameBtn.addEventListener("click", () => {
  // Reiniciar vistas y volver a configuración inicial
  scoreSection.style.display = "none";
  revealSection.style.display = "none";
  coopWordSection.style.display = "none";
  configSection.style.display = "block";
  // Restablecer formulario de configuración a valores iniciales
  numPlayersInput.value = 3;
  randomImpostorsChk.checked = false;
  numImpostorsInput.disabled = false;
  numImpostorsInput.value = 1;
  // Restablecer modo de palabra a personalizado por defecto
  wordModeRadios.forEach(radio => {
    radio.checked = (radio.value === "custom");
  });
  customListField.style.display = "block";
  customWordListTextarea.value = "";
  // Actualizar campos de jugadores (3 por defecto)
  updatePlayerFields(3);
});

// Inicializar campos de nombre al cargar la página (valor inicial de numPlayers)
updatePlayerFields(parseInt(numPlayersInput.value, 10) || 3);
// Manejar escenario inicial de mostrar/ocultar campo de lista personalizada
customListField.style.display = "block";

// Evento iniciar juego
startGameBtn.addEventListener("click", () => {
  startGame();
});
