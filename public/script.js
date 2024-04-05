const socket = io();
let playerNumber = null;

// DOM elements
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');
const winnerScreen = document.getElementById('winnerScreen');
const player1NameSpan = document.getElementById('player1Name');
const player2NameSpan = document.getElementById('player2Name');
const player1Board = document.getElementById('player1Board');
const player2Board = document.getElementById('player2Board');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');
const playAgainButton = document.getElementById('playAgain');
const nameInput = document.getElementById('nameInput');
const joinGameButton = document.getElementById('joinGame');
const keyboardContainer = document.getElementById('keyboard');
const submitGuessButton = document.getElementById('submitGuess');
const guessInput = document.getElementById('guessInput'); // The new single input field for guesses

// Join the game
joinGameButton.addEventListener('click', function() {
  const name = nameInput.value.trim();
  if (name) {
    socket.emit('joinGame', name);
  } else {
    alert('Please enter your name.');
  }
});

socket.on('playerNumber', function(number) {
  playerNumber = number;
  switchScreen(gameScreen);
  player1NameSpan.textContent = playerNumber === 1 ? 'You' : '';
  player2NameSpan.textContent = playerNumber === 2 ? 'You' : '';
});

socket.on('updatePlayerNames', function(playerNames) {
  // Assuming playerNames is an array with [player1Name, player2Name]
  player1NameSpan.textContent = playerNames[0];
  player2NameSpan.textContent = playerNames[1];
});

socket.on('errorMessage', function(message) {
  alert(message); // Display the error message from the server
});


socket.on('gameStarted', function(gameState) {
  updateGameBoards(gameState);
});

socket.on('guessMade', function(gameState) {
  updateGameBoards(gameState);
});

socket.on('gameOver', function(winner, correctWord) {
  // Update to include the correct word
  winnerAnnouncement.textContent = winner ? `${winner} wins! The correct word was ${correctWord}.` : `It's a tie! The correct word was ${correctWord}.`;
  switchScreen(winnerScreen);
});

socket.on('playerData', function(data) {
  if (data.playerNumber === 1) {
    player1NameSpan.textContent = data.name;
  } else {
    player2NameSpan.textContent = data.name;
  }
});

socket.on('resetGame', function() {
  switchScreen(joinScreen);
  resetGameBoard(player1Board);
  resetGameBoard(player2Board);
  guessInput.value = '';
  nameInput.value = '';
});

playAgainButton.addEventListener('click', function() {
  socket.emit('playAgain');
});

function switchScreen(screen) {
  joinScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  winnerScreen.classList.remove('active');
  screen.classList.add('active');
};

function submitGuess() {
  const guess = guessInput.value.trim().toUpperCase();
  if (guess.length === 5 && /^[A-Z]+$/.test(guess)) {
    socket.emit('submitGuess', { playerNumber, guess });
    guessInput.value = ''; // Clear the input after submitting
  } else {
    alert('Please enter a 5 letter word.');
  }
}





submitGuessButton.addEventListener('click', submitGuess);

// This function creates tiles for the board
function createTiles(guess, statuses, board) {
  const row = document.createElement('div');
  row.className = 'row';
  guess.split('').forEach(function(letter, index) {
    const tile = document.createElement('div');
    tile.textContent = letter.toUpperCase();
    tile.className = `tile ${statuses[index]}`;
    row.appendChild(tile);
  });
  board.appendChild(row);
}

function updateGameBoards(gameState) {
  resetGameBoard(player1Board);
  resetGameBoard(player2Board);
  gameState.guesses.forEach(function(guesses, index) {
    const board = index === 0 ? player1Board : player2Board;
    guesses.forEach(function(guessData) {
      createTiles(guessData.guess, guessData.statuses, board);
    });
  });
}

// Resets the game board
function resetGameBoard(board) {
  while (board.firstChild) {
    board.removeChild(board.firstChild);
  }
}

// Sets up the keyboard
function setupKeyboard() {
  const keys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
                'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
                'Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'];
  keys.forEach(function(key) {
    const button = document.createElement('button');
    button.textContent = key.length === 1 ? key : key === 'Enter' ? 'ENTER' : key === 'Backspace' ? '←' : key;
    button.className = 'key';
    button.addEventListener('click', function() { handleKeyClick(key); });
    keyboardContainer.appendChild(button);
  });
}

// Modify the handleKeyClick to work with the single input field
function handleKeyClick(key) {
  if (key === 'Enter') {
    submitGuess(); // Use the new submitGuess function
  } else if (key === 'Backspace') {
    guessInput.value = guessInput.value.slice(0, -1); // Remove the last character
  } else if (guessInput.value.length < 5) {
    guessInput.value += key; // Add the character to the input field
  }
  guessInput.focus(); // Keep focus on the input field
}

// Event listener for the submit guess button
submitGuessButton.addEventListener('click', function() {
  submitGuess();
});

// Updates the display of the current guess
function updateCurrentGuessDisplay() {
  const currentGuessDisplay = playerNumber === 1 ? player1Board : player2Board;
  const lastRow = currentGuessDisplay.lastChild || createEmptyRow(currentGuessDisplay);
  const tiles = lastRow.querySelectorAll('.tile');
  tiles.forEach(function(tile, index) {
    // Update to use player-specific guess
    const guess = playerGuesses[playerNumber - 1];
    tile.textContent = guess[index] || '';
    tile.className = 'tile';
  });
}

// Creates an empty row of tiles
function createEmptyRow(board) {
  const row = document.createElement('div');
  row.className = 'row';
  for (let i = 0; i < 5; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    row.appendChild(tile);
  }
  board.appendChild(row);
  return row;
}

// Event listener for the submit guess button
submitGuessButton.addEventListener('click', function() {
  let guess = '';
  guessInputs.forEach(input => {
    guess += input.value.toUpperCase();
  });
  if (guess.length === 5) {
    socket.emit('submitGuess', { playerNumber, guess });
    currentGuess = '';
    guessInputs.forEach(input => input.value = '');
  } else {
    alert('Please enter a 5 letter guess.');
  }
});

// Add focus event to jump to the next input after typing a letter
guessInputs.forEach((input, index) => {
  input.addEventListener('input', () => {
    if (input.value.length > 0 && index < guessInputs.length - 1) {
      guessInputs[index + 1].focus();
    }
  });
});

// Call setupKeyboard right away to ensure the keyboard is set up immediately
setupKeyboard();
