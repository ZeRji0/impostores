// Variables globales
let players = [];
let points = [];
let wordMode = "";
let wordsList = [];   // para modos "Mis palabras" o "Banco"
let usedWords = [];   // palabras ya usadas en "Mis palabras"/"Banco"
let coopWords = [];   // banco de palabras en modo cooperativo (sin usar)
let totalPlayers = 0;
let impostors = [];
let currentWord = "";
let currentPlayerIndex = 0;
let startPlayerIndex = 0;
let currentCoopIndex = 0;

// Referencias a elementos DOM
const numPlayersInput = document.getElementById('numPlayers');
const useCustomNamesCheckbox = document.getElementById('useCustomNames');
const namesContainer = document.getElementById('namesContainer');
const fixedImpostorsInput = document.getElementById('fixedImpostors');
const impFixedRadio = document.getElementById('impFixed');
const impRandomRadio = document.getElementById('impRandom');
const wordModeRadios = document.getElementsByName('wordMode');
const customWordsArea = document.getElementById('customWords');
const customWordsInputDiv = document.getElementById('customWordsInput');
const startGameBtn = document.getElementById('startGameBtn');
// Pantalla cooperativa
const coopTurnText = document.getElementById('coopTurn');
const coopStartBtn = document.getElementById('coopStartBtn');
const coopInputContainer = document.getElementById('coopInputContainer');
const coopWordsArea = document.getElementById('coopWords');
const coopHideBtn = document.getElementById('coopHideBtn');
const coopNextBtn = document.getElementById('coopNextBtn');
// Pantalla de roles
const roleTurnText = document.getElementById('roleTurn');
const roleCard = document.getElementById('roleCard');
const cardMessage = roleCard.querySelector('.card-message');
const roleTextElem = roleCard.querySelector('.role-text');
const nextRoleBtn = document.getElementById('nextRoleBtn');
// Pantalla de juego
const startPlayerText = document.getElementById('startPlayerText');
const newRoundBtn = document.getElementById('newRoundBtn');
const scoreBtn = document.getElementById('scoreBtn');
const configBtn = document.getElementById('configBtn');
// Pantalla de marcador
const scoreTableBody = document.querySelector('#scoreTable tbody');
const scoreCloseBtn = document.getElementById('scoreCloseBtn');
const scoreNewRoundBtn = document.getElementById('scoreNewRoundBtn');
const scoreConfigBtn = document.getElementById('scoreConfigBtn');

// Listas predefinidas de palabras (banco y respaldo aleatorio)
const bankWords = [
  'gato','perro','elefante','tigre','manzana','pizza','chocolate','reloj','computadora',
  'teléfono','avión','playa','montaña','ciudad','doctor','música','película','fútbol',
  'guitarra','dinosaurio','robot','restaurante','bebé'
];
const randomFallbackWords = bankWords;  // usar la misma lista como respaldo local

// Función auxiliar: mostrar una pantalla y ocultar las demás
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(scr => scr.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// Actualizar campos de nombres personalizados según número de jugadores
function updateNameFields() {
  namesContainer.innerHTML = '';
  if (!useCustomNamesCheckbox.checked) return;
  const n = parseInt(numPlayersInput.value);
  for (let i = 1; i <= n; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Jugador ' + i;
    namesContainer.appendChild(input);
  }
}

// Actualizar máximos y habilitación del campo de impostores fijos
function updateImpostorInput() {
  let n = parseInt(numPlayersInput.value);
  if (n < 2 || isNaN(n)) {
    n = 2;
    numPlayersInput.value = 2;
  }
  const maxImp = n > 1 ? n - 1 : 1;
  fixedImpostorsInput.max = maxImp;
  if (parseInt(fixedImpostorsInput.value) > maxImp) {
    fixedImpostorsInput.value = maxImp;
  }
  // Deshabilitar campo de número si está seleccionado "aleatorio"
  fixedImpostorsInput.disabled = impRandomRadio.checked;
}

// Iniciar una nueva ronda de juego con la configuración actual
async function startRound() {
  // Seleccionar la palabra secreta según el modo
  let secretWord = '';
  if (wordMode === 'custom') {
    // Palabra al azar de la lista personalizada (sin repetir hasta agotar)
    const available = wordsList.filter(w => !usedWords.includes(w));
    if (available.length === 0) {
      usedWords = [];  // resetear si se agotaron todas
      available.push(...wordsList);
    }
    secretWord = available[Math.floor(Math.random() * available.length)];
    usedWords.push(secretWord);
  } else if (wordMode === 'random') {
    try {
      const response = await fetch('https://random-word-api.herokuapp.com/word?lang=es');
      const data = await response.json();
      if (data && data.length > 0) {
        secretWord = data[0];
      } else {
        throw new Error('Empty response');
      }
    } catch {
      // Si falla la API, usar lista local de respaldo
      const available = randomFallbackWords.filter(w => !usedWords.includes(w));
      if (available.length === 0) {
        usedWords = [];
        available.push(...randomFallbackWords);
      }
      secretWord = available[Math.floor(Math.random() * available.length)];
      usedWords.push(secretWord);
    }
  } else if (wordMode === 'bank') {
    const available = wordsList.filter(w => !usedWords.includes(w));
    if (available.length === 0) {
      usedWords = [];
      available.push(...wordsList);
    }
    secretWord = available[Math.floor(Math.random() * available.length)];
    usedWords.push(secretWord);
  }
  // Elegir impostores al azar
  let impostorCount = impRandomRadio.checked ? Math.floor(Math.random() * (players.length - 1)) + 1
                                            : parseInt(fixedImpostorsInput.value) || 1;
  if (impostorCount >= players.length) impostorCount = players.length - 1;
  impostors = [];
  // Elegir impostorCount índices aleatorios únicos
  const indices = players.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  impostors = indices.slice(0, impostorCount);
  // Si modo cooperativo, seleccionar palabra excluyendo las del impostor
  if (wordMode === 'coop') {
    let candidateWords = coopWords.filter(obj => !impostors.includes(obj.player));
    if (candidateWords.length === 0) {
      // No hay palabra disponible que no sea de impostor
      if (coopWords.length === 0) {
        alert('No quedan palabras disponibles. Por favor, agregad más palabras para continuar.');
      } else {
        alert('Las únicas palabras restantes pertenecen al impostor. Por favor, agregad más palabras.');
      }
      // Volver a reactivar entrada cooperativa para añadir palabras
      currentCoopIndex = 0;
      coopTurnText.textContent = 'Turno de: ' + players[0];
      coopStartBtn.style.display = 'inline-block';
      coopInputContainer.style.display = 'none';
      coopNextBtn.style.display = 'none';
      showScreen('coopScreen');
      return;
    }
    // Escoger una palabra de las candidatas y marcarla como usada
    const choiceObj = candidateWords[Math.floor(Math.random() * candidateWords.length)];
    secretWord = choiceObj.word;
    const idx = coopWords.indexOf(choiceObj);
    if (idx !== -1) coopWords.splice(idx, 1);
  }
  currentWord = secretWord;
  // Elegir quién empieza a hablar
  startPlayerIndex = Math.floor(Math.random() * players.length);
  // Preparar pantalla de roles para el primer jugador
  currentPlayerIndex = 0;
  roleTurnText.textContent = 'Turno de: ' + players[currentPlayerIndex];
  nextRoleBtn.textContent = '➡️ Pasar al siguiente';
  // Configurar la tarjeta de rol para el jugador actual
  if (impostors.includes(currentPlayerIndex)) {
    roleTextElem.textContent = 'Eres el impostor 👀';
  } else {
    roleTextElem.textContent = currentWord;
  }
  roleTextElem.style.visibility = 'hidden';
  cardMessage.style.display = 'block';
  nextRoleBtn.disabled = true;
  showScreen('rolesScreen');
}

// Mostrar pantalla principal de juego con el jugador inicial
function showPlayScreen() {
  startPlayerText.textContent = 'Empieza: ' + players[startPlayerIndex];
  showScreen('playScreen');
}

// Construir la tabla de marcador con los puntos actuales
function buildScoreTable() {
  scoreTableBody.innerHTML = '';
  players.forEach((name, i) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = name;
    const scoreTd = document.createElement('td');
    const minusBtn = document.createElement('button');
    minusBtn.textContent = '-';
    const ptsSpan = document.createElement('span');
    ptsSpan.textContent = points[i];
    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    // Espaciado alrededor del número
    minusBtn.style.marginRight = '5px';
    plusBtn.style.marginLeft = '5px';
    scoreTd.appendChild(minusBtn);
    scoreTd.appendChild(ptsSpan);
    scoreTd.appendChild(plusBtn);
    tr.appendChild(nameTd);
    tr.appendChild(scoreTd);
    scoreTableBody.appendChild(tr);
    // Eventos de botones de puntuación
    minusBtn.addEventListener('click', () => {
      if (points[i] > 0) {
        points[i]--;
        ptsSpan.textContent = points[i];
      }
    });
    plusBtn.addEventListener('click', () => {
      points[i]++;
      ptsSpan.textContent = points[i];
    });
  });
}

// Eventos de formulario de configuración
numPlayersInput.addEventListener('change', () => {
  updateImpostorInput();
  if (useCustomNamesCheckbox.checked) {
    updateNameFields();
  }
});
useCustomNamesCheckbox.addEventListener('change', () => {
  if (useCustomNamesCheckbox.checked) {
    namesContainer.style.display = 'block';
    updateNameFields();
  } else {
    namesContainer.style.display = 'none';
    namesContainer.innerHTML = '';
  }
});
impFixedRadio.addEventListener('change', updateImpostorInput);
impRandomRadio.addEventListener('change', updateImpostorInput);
wordModeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    customWordsInputDiv.style.display = (radio.value === 'custom') ? 'block' : 'none';
  });
});
startGameBtn.addEventListener('click', () => {
  const n = parseInt(numPlayersInput.value);
  if (isNaN(n) || n < 2) {
    alert('El número de jugadores debe ser al menos 2.');
    return;
  }
  totalPlayers = n;
  players = [];
  points = [];
  // Obtener nombres de jugadores
  if (useCustomNamesCheckbox.checked) {
    const nameInputs = namesContainer.querySelectorAll('input');
    nameInputs.forEach((input, index) => {
      let name = input.value.trim();
      if (name === '') name = 'Jugador ' + (index + 1);
      players.push(name);
    });
  } else {
    for (let i = 1; i <= totalPlayers; i++) {
      players.push('Jugador ' + i);
    }
  }
  // Inicializar puntuaciones en 0
  points = new Array(players.length).fill(0);
  // Determinar modo de palabras seleccionado
  const selectedModeRadio = document.querySelector('input[name="wordMode"]:checked');
  wordMode = selectedModeRadio ? selectedModeRadio.value : 'custom';
  usedWords = [];
  if (wordMode === 'custom') {
    const inputText = customWordsArea.value.trim();
    if (!inputText) {
      alert('Introduce una lista de palabras para jugar.');
      return;
    }
    wordsList = inputText.split(',').map(w => w.trim()).filter(w => w);
    if (wordsList.length === 0) {
      alert('La lista de palabras personalizadas está vacía.');
      return;
    }
  } else if (wordMode === 'bank') {
    wordsList = [...bankWords];
  } else if (wordMode === 'coop') {
    // Iniciar flujo cooperativo
    coopWords = [];
    currentCoopIndex = 0;
    coopTurnText.textContent = 'Turno de: ' + players[0];
    coopStartBtn.style.display = 'inline-block';
    coopInputContainer.style.display = 'none';
    coopNextBtn.style.display = 'none';
    showScreen('coopScreen');
    return;
  }
  // Comenzar la primera ronda directamente (para otros modos)
  startRound();
});

// Eventos en pantalla cooperativa
coopStartBtn.addEventListener('click', () => {
  coopInputContainer.style.display = 'block';
  coopStartBtn.style.display = 'none';
  coopWordsArea.value = '';
  coopWordsArea.focus();
});
coopHideBtn.addEventListener('click', () => {
  const text = coopWordsArea.value.trim();
  if (!text) {
    alert('Debes escribir al menos una palabra.');
    return;
  }
  const wordList = text.split(',').map(w => w.trim()).filter(w => w);
  if (wordList.length === 0) {
    alert('Debes escribir al menos una palabra.');
    return;
  }
  wordList.forEach(w => {
    coopWords.push({ word: w, player: currentCoopIndex });
  });
  coopInputContainer.style.display = 'none';
  coopWordsArea.value = '';
  coopNextBtn.style.display = 'inline-block';
});
coopNextBtn.addEventListener('click', () => {
  if (currentCoopIndex < players.length - 1) {
    currentCoopIndex++;
    coopTurnText.textContent = 'Turno de: ' + players[currentCoopIndex];
    coopStartBtn.style.display = 'inline-block';
    coopInputContainer.style.display = 'none';
    coopNextBtn.style.display = 'none';
  } else {
    // Último jugador completó sus palabras, iniciar juego
    startRound();
  }
});

// Eventos de la pantalla de roles (deslizamiento de tarjeta)
let touchStartY = 0;
let cardDrag = false;
roleCard.addEventListener('touchstart', e => {
  if (e.touches.length > 0) {
    touchStartY = e.touches[0].clientY;
    cardDrag = true;
    roleCard.style.transition = 'none';  // sin animación durante arrastre
  }
});
roleCard.addEventListener('touchmove', e => {
  if (!cardDrag) return;
  const currentY = e.touches[0].clientY;
  const delta = touchStartY - currentY;
  const containerH = document.getElementById('rolesScreen').clientHeight;
  const initialOffset = containerH * 0.6;
  let newBottom = -initialOffset + delta;
  if (newBottom > 0) newBottom = 0;
  if (newBottom < -initialOffset) newBottom = -initialOffset;
  roleCard.style.bottom = newBottom + 'px';
});
roleCard.addEventListener('touchend', e => {
  if (!cardDrag) return;
  cardDrag = false;
  roleCard.style.transition = '';  // restaurar transición CSS
  const currentY = e.changedTouches[0].clientY;
  const delta = touchStartY - currentY;
  const containerH = document.getElementById('rolesScreen').clientHeight;
  const initialOffset = containerH * 0.6;
  const revealThreshold = initialOffset * 0.3;
  if (delta > revealThreshold) {
    // Revelar rol
    roleCard.style.bottom = '0';
    cardMessage.style.display = 'none';
    roleTextElem.style.visibility = 'visible';
    setTimeout(() => {
      // Ocultar nuevamente después de 1s
      roleTextElem.style.visibility = 'hidden';
      cardMessage.style.display = 'block';
      roleCard.style.bottom = '-60%';
      if (currentPlayerIndex === players.length - 1) {
        nextRoleBtn.textContent = '➡️ Continuar';
      }
      nextRoleBtn.disabled = false;
    }, 1000);
  } else {
    // No se completó el arrastre, volver a posición inicial
    roleCard.style.bottom = '-60%';
    cardMessage.style.display = 'block';
    roleTextElem.style.visibility = 'hidden';
  }
});
// Soporte de arrastre con mouse (opcional para pruebas en PC)
roleCard.addEventListener('mousedown', e => {
  touchStartY = e.clientY;
  cardDrag = true;
  roleCard.style.transition = 'none';
});
window.addEventListener('mousemove', e => {
  if (!cardDrag) return;
  const currentY = e.clientY;
  const delta = touchStartY - currentY;
  const containerH = document.getElementById('rolesScreen').clientHeight;
  const initialOffset = containerH * 0.6;
  let newBottom = -initialOffset + delta;
  if (newBottom > 0) newBottom = 0;
  if (newBottom < -initialOffset) newBottom = -initialOffset;
  roleCard.style.bottom = newBottom + 'px';
});
window.addEventListener('mouseup', e => {
  if (!cardDrag) return;
  cardDrag = false;
  roleCard.style.transition = '';
  const currentY = e.clientY;
  const delta = touchStartY - currentY;
  const containerH = document.getElementById('rolesScreen').clientHeight;
  const initialOffset = containerH * 0.6;
  const revealThreshold = initialOffset * 0.3;
  if (delta > revealThreshold) {
    roleCard.style.bottom = '0';
    cardMessage.style.display = 'none';
    roleTextElem.style.visibility = 'visible';
    setTimeout(() => {
      roleTextElem.style.visibility = 'hidden';
      cardMessage.style.display = 'block';
      roleCard.style.bottom = '-60%';
      if (currentPlayerIndex === players.length - 1) {
        nextRoleBtn.textContent = '➡️ Continuar';
      }
      nextRoleBtn.disabled = false;
    }, 1000);
  } else {
    roleCard.style.bottom = '-60%';
    cardMessage.style.display = 'block';
    roleTextElem.style.visibility = 'hidden';
  }
});

// Botón "Pasar al siguiente"
nextRoleBtn.addEventListener('click', () => {
  nextRoleBtn.disabled = true;
  currentPlayerIndex++;
  if (currentPlayerIndex < players.length) {
    // Siguiente jugador
    roleTurnText.textContent = 'Turno de: ' + players[currentPlayerIndex];
    if (impostors.includes(currentPlayerIndex)) {
      roleTextElem.textContent = 'Eres el impostor 👀';
    } else {
      roleTextElem.textContent = currentWord;
    }
    roleCard.style.bottom = '-60%';
    cardMessage.style.display = 'block';
    roleTextElem.style.visibility = 'hidden';
  } else {
    // Último jugador ya reveló: iniciar fase de juego
    showPlayScreen();
  }
});

// Pantalla principal de juego
newRoundBtn.addEventListener('click', () => {
  if (wordMode !== 'coop') {
    startRound();
  } else {
    if (coopWords.length === 0) {
      alert('No quedan palabras en el banco cooperativo. Añadiendo más palabras.');
      currentCoopIndex = 0;
      coopTurnText.textContent = 'Turno de: ' + players[0];
      coopStartBtn.style.display = 'inline-block';
      coopInputContainer.style.display = 'none';
      coopNextBtn.style.display = 'none';
      showScreen('coopScreen');
    } else {
      startRound();
    }
  }
});
scoreBtn.addEventListener('click', () => {
  buildScoreTable();
  showScreen('scoreScreen');
});
configBtn.addEventListener('click', () => {
  showScreen('configScreen');
});

// Pantalla de marcador/menú
scoreCloseBtn.addEventListener('click', () => {
  showScreen('playScreen');
});
scoreNewRoundBtn.addEventListener('click', () => {
  scoreScreen.classList.add('hidden');
  if (wordMode !== 'coop') {
    startRound();
  } else {
    if (coopWords.length === 0) {
      alert('No quedan palabras en el banco cooperativo. Añadiendo más palabras.');
      currentCoopIndex = 0;
      coopTurnText.textContent = 'Turno de: ' + players[0];
      coopStartBtn.style.display = 'inline-block';
      coopInputContainer.style.display = 'none';
      coopNextBtn.style.display = 'none';
      showScreen('coopScreen');
      return;
    }
    startRound();
  }
});
scoreConfigBtn.addEventListener('click', () => {
  showScreen('configScreen');
});
