const socket = io();
let mode = 'local';
let mySymbol = 'X';
let currentTurn = 'X';
let currentRoom = null;
let boardState = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;

const statusText = document.getElementById('statusText');
const cells = document.querySelectorAll('.cell');

const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function startLocalMode() {
  mode = 'local';
  resetGame();
  gameActive = true;
  statusText.innerText = "Local Co-op: Sıra X'te";
}

function createOnlineRoom() {
  mode = 'online';
  socket.emit('create_room');
}

function joinOnlineRoom() {
  const code = document.getElementById('roomInput').value.trim();
  if (code.length === 4) {
    mode = 'online';
    socket.emit('join_room', { room: code });
  } else {
    alert("Lütfen 4 haneli oda kodunu girin!");
  }
}

function cellClicked(index) {
  if (!gameActive || boardState[index] !== '') return;

  if (mode === 'local') {
    boardState[index] = currentTurn;
    renderBoard();
    
    if (checkWin(currentTurn)) {
      statusText.innerText = `Kazanan: ${currentTurn}! 🎉`;
      gameActive = false;
    } else if (boardState.every(c => c !== '')) {
      statusText.innerText = "Berabere!";
      gameActive = false;
    } else {
      currentTurn = currentTurn === 'X' ? 'O' : 'X';
      statusText.innerText = `Sıra ${currentTurn}'de`;
    }
  } else if (mode === 'online') {
    if (currentTurn === mySymbol) {
      socket.emit('make_move', { room: currentRoom, index: index, symbol: mySymbol });
    }
  }
}

function renderBoard() {
  cells.forEach((cell, i) => {
    cell.innerText = boardState[i];
    cell.className = `cell ${boardState[i]}`;
  });
}

function resetGame() {
  boardState = ['', '', '', '', '', '', '', '', ''];
  currentTurn = 'X';
  renderBoard();
}

function checkWin(symbol) {
  return winPatterns.some(pattern => pattern.every(i => boardState[i] === symbol));
}

// SOCKET.IO DİNLEYİCİLERİ
socket.on('room_created', data => {
  currentRoom = data.room;
  mySymbol = 'X';
  statusText.innerText = `Kod: ${data.room} (Rakip Bekleniyor)`;
  resetGame();
});

socket.on('game_start', data => {
  currentRoom = data.room;
  if (!mySymbol) mySymbol = data.symbol;
  currentTurn = data.turn;
  gameActive = true;
  statusText.innerText = `Başladı! Sen: ${mySymbol} | Sıra: ${currentTurn}`;
  resetGame();
});

socket.on('update_board', data => {
  boardState = data.board;
  currentTurn = data.turn;
  renderBoard();
  
  if (checkWin('X')) {
    statusText.innerText = "Kazanan: X!";
    gameActive = false;
  } else if (checkWin('O')) {
    statusText.innerText = "Kazanan: O!";
    gameActive = false;
  } else if (boardState.every(c => c !== '')) {
    statusText.innerText = "Berabere!";
    gameActive = false;
  } else {
    statusText.innerText = `Sıra: ${currentTurn} ${currentTurn === mySymbol ? '(Sen)' : ''}`;
  }
});

socket.on('error', data => alert(data.message));
