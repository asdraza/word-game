const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Define a minimum occurrence threshold.
const MIN_OCCURRENCE = 1e-06; // Adjust this threshold as needed.

const words = []; // For valid guesses
const targetWords = []; // Words that can be chosen as the target

fs.createReadStream(path.join(__dirname, 'wordle.csv'))
  .pipe(csv())
  .on('data', (data) => {
    const word = data.word.toUpperCase();
    const occurrence = parseFloat(data.occurrence);

    // Add all words to the words list for guessing
    words.push(word);

    // Only add words above the threshold to the targetWords list
    if (occurrence >= MIN_OCCURRENCE) {
      targetWords.push(word);
    }
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });



let gameState = {
  players: [],
  currentPlayerIndex: 0,
  targetWord: '',
  guesses: [[], []],
  maxTurns: 5
};

function startGame() {
  const randomIndex = Math.floor(Math.random() * targetWords.length);
  gameState.targetWord = targetWords[randomIndex];
  gameState.guesses = [[], []];
  gameState.currentPlayerIndex = 0;
  io.emit('gameStarted', gameState);
}

io.on('connection', (socket) => {
  socket.on('joinGame', (name) => {
    if (gameState.players.length < 2) {
      const player = { id: socket.id, name };
      gameState.players.push(player);
      socket.emit('playerNumber', gameState.players.length);
      socket.emit('playerData', { ...player, playerNumber: gameState.players.length });

      if (gameState.players.length === 2) {
        startGame();
        // Emit an event to update both players with the names
        const playerNames = gameState.players.map(player => player.name);
        io.emit('updatePlayerNames', playerNames); // Create this event handler on the client
      }
    }
  });

  socket.on('submitGuess', ({ playerNumber, guess }) => {
    const playerIndex = playerNumber - 1;
    const uppercaseGuess = guess.toUpperCase(); // Convert to uppercase
  
    if (playerIndex !== gameState.currentPlayerIndex) {
      return socket.emit('errorMessage', 'It is not your turn.');
    }
  
    if (uppercaseGuess.length !== 5 || !/^[A-Z]+$/.test(uppercaseGuess)) {
      return socket.emit('errorMessage', 'Your guess must be a 5 letter word.');
    }
  
    if (!words.includes(uppercaseGuess)) {
      return socket.emit('errorMessage', 'Guess is not a valid word.');
    }
  
    const guessStatuses = getGuessStatus(uppercaseGuess, gameState.targetWord);
    gameState.guesses[playerIndex].push({ guess: uppercaseGuess, statuses: guessStatuses });
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 2;
      
    io.emit('guessMade', gameState);
    checkWinCondition(uppercaseGuess, playerIndex);
  });
  
  

  socket.on('playAgain', () => {
    gameState = resetGameState();
    io.emit('resetGame');
  });

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    if (gameState.players.length < 2) {
      io.emit('gameOver', null, gameState.targetWord);
      gameState = resetGameState();
    }
  });
});

function getGuessStatus(guess, targetWord) {
  const guessLetters = guess.split('');
  const targetLetters = targetWord.split('');
  let statuses = Array(guess.length).fill('wrong');

  // First pass: Check for correct positions
  guessLetters.forEach((letter, index) => {
    if (letter === targetLetters[index]) {
      statuses[index] = 'correct-position';
      targetLetters[index] = null; // Remove matched letter from consideration
    }
  });

  // Second pass: Check for correct letters in wrong positions
  guessLetters.forEach((letter, index) => {
    if (statuses[index] !== 'correct-position' && targetLetters.includes(letter)) {
      statuses[index] = 'correct';
      targetLetters[targetLetters.indexOf(letter)] = null; // Remove matched letter from consideration
    }
  });

  return statuses;
}

function checkWinCondition(guess, playerIndex) {
  const playerHasWon = guess === gameState.targetWord;
  const gameIsTied = gameState.guesses[0].length === gameState.maxTurns && 
                     gameState.guesses[1].length === gameState.maxTurns;

  if (playerHasWon || gameIsTied) {
    let winner = playerHasWon ? gameState.players[playerIndex].name : null;
    io.emit('gameOver', winner, gameState.targetWord);
    gameState = resetGameState();
  }
}

function resetGameState() {
  return {
    players: [],
    currentPlayerIndex: 0,
    targetWord: '',
    guesses: [[], []],
    maxTurns: 5 // Assuming you want the game to be 5 turns
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});