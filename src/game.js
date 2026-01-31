import { decodeFromUrlSafe } from './utils/urlEncoding.js';
import { Puzzle } from './puzzle.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Collectible } from './collectible.js';
import { Obstacle } from './obstacle.js';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const encodedPhrase = urlParams.get('p');

// DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const piecesDisplay = document.getElementById('piecesDisplay');
const progressText = document.getElementById('progressText');
const victoryScreen = document.getElementById('victoryScreen');
const solvedPhrase = document.getElementById('solvedPhrase');
const playAgainBtn = document.getElementById('playAgainBtn');
const failCountDisplay = document.getElementById('failCountDisplay');
const instructions = document.getElementById('instructions');
const startBtn = document.getElementById('startBtn');
const guessBtn = document.getElementById('guessBtn');
const guessModal = document.getElementById('guessModal');
const guessHint = document.getElementById('guessHint');
const guessInput = document.getElementById('guessInput');
const submitGuessBtn = document.getElementById('submitGuessBtn');
const cancelGuessBtn = document.getElementById('cancelGuessBtn');
const guessError = document.getElementById('guessError');

// Game state
let puzzle = null;
let player = null;
let world = null;
let collectibles = [];
let obstacles = [];
let gameStarted = false;
let gameOver = false;
let gamePaused = false;
let animationId = null;
let score = 0;
let failCount = 0;

// Flappy Bird style constants (values may be overridden for mobile)
let PLAYER_X = 150; // Fixed X position for player
let OBSTACLE_SPAWN_DISTANCE = 350; // Distance between obstacles (in pixels)
let GAP_SIZE = 200; // Size of gap in obstacles
let MIN_GAP_Y = 150; // Minimum gap center Y
let SCROLL_SPEED = 3; // Default horizontal movement speed for obstacles/collectibles
let PLAYER_GRAVITY = 0.6;
let PLAYER_FLAP = -10;
let COLLECTIBLE_SPAWN_FRAMES = 120; // How often to attempt collectible spawn (in frames)

let lastObstacleX = 0; // Track last obstacle X position

// Simple mobile detection (touch + small screen OR userAgent)
function isMobileDevice() {
  try {
    const ua = navigator.userAgent || '';
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const smallScreen = window.innerWidth <= 800;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);
    return (touch && smallScreen) || uaMobile;
  } catch (e) {
    return false;
  }
}

// Apply mobile-friendly overrides
if (isMobileDevice()) {
  PLAYER_X = 120;
  OBSTACLE_SPAWN_DISTANCE = 420;
  GAP_SIZE = 260;
  MIN_GAP_Y = 120;
  SCROLL_SPEED = 2.2; // slower for easier timing on touch
  PLAYER_GRAVITY = 0.45; // softer gravity for easier control
  PLAYER_FLAP = -12; // stronger flap
  COLLECTIBLE_SPAWN_FRAMES = 90; // spawn collectibles slightly more often
}

// Track which pieces need to spawn
let piecesToSpawn = [];
let frameCount = 0;

// Initialize the game
function init() {
  // Set controls hint based on device
  const controlsHint = document.getElementById('controlsHint');
  if (controlsHint) {
    if (isMobileDevice()) {
      controlsHint.innerHTML = '<strong>Tap</strong> to flap';
    } else {
      controlsHint.innerHTML = '<strong>Click</strong> or press <strong>SPACE</strong> to flap';
    }
  }
  
  // Check if phrase parameter exists
  if (!encodedPhrase) {
    alert('No puzzle found! Please use a valid link from the sender page.');
    window.location.href = 'sender.html';
    return;
  }
  
  try {
    // Decode the phrase
    const phrase = decodeFromUrlSafe(encodedPhrase);
    console.log('Decoded phrase:', phrase);
    
    // Create puzzle (spaces are auto-collected in the Puzzle constructor)
    puzzle = new Puzzle(phrase);
    console.log('Puzzle pieces:', puzzle.pieces);
    console.log('Non-space pieces to collect:', puzzle.getNonSpaceCount());
    
    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Set up input listeners
    setupInput();
    
    // Update HUD
    updateHUD();
    
    // Draw initial state
    drawInitialScreen();
    
  } catch (error) {
    console.error('Error decoding phrase:', error);
    alert('Invalid puzzle link! Please check the URL.');
    window.location.href = 'sender.html';
  }
}

// Set up keyboard and mouse input
function setupInput() {
  // Keyboard input - Space to flap, G to guess, Escape to close modal
  window.addEventListener('keydown', (e) => {
    // Handle guess modal
    if (gamePaused) {
      if (e.code === 'Escape') {
        e.preventDefault();
        hideGuessModal();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        submitGuess();
      }
      return;
    }
    
    if (e.code === 'Space') {
      e.preventDefault();
      
      if (!gameStarted) {
        startGame();
      } else if (gameOver) {
        resetGame();
      } else if (player) {
        player.flap();
      }
    } else if (e.code === 'KeyG' && gameStarted && !gameOver) {
      e.preventDefault();
      showGuessModal();
    }
  });
  
  // Mouse/touch input - Click/tap to flap
  canvas.addEventListener('click', () => {
    if (gamePaused) return;
    
    if (!gameStarted) {
      startGame();
    } else if (gameOver) {
      resetGame();
    } else if (player) {
      player.flap();
    }
  });
  
  // Guess button click
  guessBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (gameStarted && !gameOver && !gamePaused) {
      showGuessModal();
    }
  });
  
  // Submit guess button
  submitGuessBtn.addEventListener('click', submitGuess);
  
  // Cancel guess button
  cancelGuessBtn.addEventListener('click', hideGuessModal);
  
  // Prevent clicks on modal from propagating
  guessModal.addEventListener('click', (e) => {
    if (e.target === guessModal) {
      hideGuessModal();
    }
  });
}

// Resize canvas to fill window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  if (world) {
    world.resize(canvas.width, canvas.height);
  }
  
  if (!gameStarted && puzzle) {
    drawInitialScreen();
  }
}

// Draw initial screen before game starts
function drawInitialScreen() {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw title text
  ctx.fillStyle = '#333';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Flappy Puzzle', canvas.width / 2, canvas.height / 2 - 100);
  
  // Draw phrase info
  ctx.font = '24px Arial';
  ctx.fillText(`Collect ${puzzle.getNonSpaceCount()} letters to reveal the phrase!`, 
               canvas.width / 2, canvas.height / 2 - 40);
  
  ctx.font = '20px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText('Click or press SPACE to start', 
               canvas.width / 2, canvas.height / 2 + 20);
}

// Update HUD display
function updateHUD() {
  piecesDisplay.textContent = puzzle.getReconstructedPhrase();
  progressText.textContent = `${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`;
}

// Start the game
function startGame() {
  gameStarted = true;
  gameOver = false;
  instructions.classList.add('hidden');
  
  // Create game objects
  world = new World(canvas.width, canvas.height);
  player = new Player(PLAYER_X, canvas.height / 2, { gravity: PLAYER_GRAVITY, flapStrength: PLAYER_FLAP });
  
  // Initialize pieces to spawn - only one index per distinct non-space character
  piecesToSpawn = puzzle.getUniqueNonSpaceIndices().slice();
  shuffleArray(piecesToSpawn);
  
  // Reset game state
  collectibles = [];
  obstacles = [];
  score = 0;
  frameCount = 0;
  lastObstacleX = canvas.width; // Start with first obstacle off screen
  
  // Start game loop
  gameLoop();
}

// Utility function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Show guess modal
function showGuessModal() {
  gamePaused = true;
  cancelAnimationFrame(animationId);
  
  // Show current progress as hint with styled slots
  const phrase = puzzle.getReconstructedPhrase();
  guessHint.innerHTML = phrase.split('').map(char => {
    if (char === ' ') {
      return '<span style="display:inline-block;width:0.5em;"></span>';
    }
    const isCollected = char !== '_';
    return `<span class="letter-slot" style="${isCollected ? 'border-bottom-color:#48bb78;color:#48bb78;' : ''}">${char}</span>`;
  }).join('');
  
  guessInput.value = '';
  guessError.classList.add('hidden');
  guessModal.classList.remove('hidden');
  
  // Focus the input
  setTimeout(() => guessInput.focus(), 100);
}

// Hide guess modal
function hideGuessModal() {
  gamePaused = false;
  guessModal.classList.add('hidden');
  guessInput.value = '';
  guessError.classList.add('hidden');
  
  // Resume game loop
  if (gameStarted && !gameOver) {
    gameLoop();
  }
}

// Submit guess
function submitGuess() {
  const guess = guessInput.value.trim();
  
  if (!guess) return;
  
  // Compare guess to original phrase (case-insensitive)
  if (guess.toLowerCase() === puzzle.originalPhrase.toLowerCase()) {
    // Correct! Mark all pieces as collected and show victory
    puzzle.pieces.forEach((_, index) => {
      puzzle.collectedPieces[index] = true;
    });
    updateHUD();
    
    gamePaused = false;
    guessModal.classList.add('hidden');
    gameStarted = false;
    
    setTimeout(showVictory, 300);
  } else {
    // Incorrect - show error and let them continue
    guessError.classList.remove('hidden');
    guessInput.select();
  }
}

// Main game loop
function gameLoop() {
  if (!gameStarted || gameOver || gamePaused) return;
  
  // Update
  update();
  
  // Draw
  draw();
  
  // Continue loop
  animationId = requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
  frameCount++;
  
  // Update world (clouds)
  world.update();
  
  // Update player (Flappy Bird style - vertical only)
  player.update(canvas.height);
  
  // Spawn obstacles (collectibles are spawned in gaps when obstacles spawn)
  spawnObstacles();
  
  // Update obstacles
  updateObstacles();
  
  // Update collectibles
  updateCollectibles();
  
  // Check collisions
  checkCollisions();
  
  // Check for victory
  if (puzzle.isComplete() && gameStarted && !gameOver) {
    gameStarted = false;
    cancelAnimationFrame(animationId);
    setTimeout(showVictory, 500);
  }
}

// Spawn obstacles (Flappy Bird pipes)
function spawnObstacles() {
  // Only spawn if there are no obstacles OR the last obstacle is far enough away
  if (obstacles.length === 0) {
    // Spawn first obstacle
    spawnSingleObstacle();
  } else {
    // Get the last obstacle
    const lastObstacle = obstacles[obstacles.length - 1];
    
    // Check if last obstacle is far enough to spawn next one
    if (lastObstacle.x < canvas.width - OBSTACLE_SPAWN_DISTANCE) {
      spawnSingleObstacle();
    }
  }
}

// Spawn a single obstacle
function spawnSingleObstacle() {
  const maxGapY = canvas.height - MIN_GAP_Y - 50;
  const gapY = MIN_GAP_Y + Math.random() * (maxGapY - MIN_GAP_Y);
  
  const obstacle = new Obstacle(canvas.width + 50, canvas.height, gapY, GAP_SIZE);
  // apply global scroll speed
  obstacle.scrollSpeed = SCROLL_SPEED;
  obstacles.push(obstacle);
  
  // Spawn a collectible in this obstacle's gap if there are pieces left
  if (piecesToSpawn.length > 0) {
    spawnCollectibleInGap(obstacle);
  }
}

// Update obstacles
function updateObstacles() {
  obstacles.forEach(obstacle => {
    obstacle.update();
    
    // Check if player passed this obstacle (for score)
    if (obstacle.hasPassed(player.x)) {
      score++;
    }
  });
  
  // Remove off-screen obstacles
  obstacles = obstacles.filter(o => !o.isOffScreen());
}

// Spawn a collectible attached to a specific obstacle's gap
function spawnCollectibleInGap(obstacle) {
  // Skip if no pieces left to spawn
  if (piecesToSpawn.length === 0) return;
  
  // Skip any indices that were already collected
  while (piecesToSpawn.length > 0 && puzzle.collectedPieces[piecesToSpawn[0]]) {
    piecesToSpawn.shift();
  }
  if (piecesToSpawn.length === 0) return;

  const nextIndex = piecesToSpawn.shift();
  const piece = puzzle.getPiece(nextIndex);
  if (piece == null) return;

  const gap = obstacle.getGapBounds();
  // Spawn AFTER the obstacle (to the right of the pipe) so player can collect it while flying through
  const spawnX = obstacle.x + obstacle.width + 30; // place collectible past the pipe
  
  // Place collectible somewhere inside the gap (with small padding)
  const padding = 12;
  const availableHeight = Math.max(0, gap.height - padding * 2);
  let spawnY = gap.y + padding + Math.random() * availableHeight;

  // Clamp to canvas bounds
  spawnY = Math.max(10, Math.min(canvas.height - 50, spawnY));

  const collectible = new Collectible(spawnX, spawnY, nextIndex, piece);
  // apply mobile-friendly adjustments
  collectible.scrollSpeed = SCROLL_SPEED;
  if (isMobileDevice()) {
    collectible.width = 48;
    collectible.height = 48;
  }
  collectibles.push(collectible);
}

// Update all collectibles
function updateCollectibles() {
  collectibles.forEach(collectible => {
    collectible.update();
  });
  
  // Remove collected or off-screen collectibles
  collectibles = collectibles.filter(c => {
    if (c.collected) return false;
    
    if (c.isOffScreen()) {
      // Re-add this piece to the spawn queue if it wasn't collected
      if (!puzzle.collectedPieces[c.pieceIndex]) {
        piecesToSpawn.push(c.pieceIndex);
      }
      return false;
    }
    
    return true;
  });
}

// Check collisions
function checkCollisions() {
  const playerBounds = player.getBounds();

  // Check collision with obstacles
  for (const obstacle of obstacles) {
    if (obstacle.collidesWith(playerBounds)) {
      triggerGameOver();
      return;
    }
  }

  // Check if player went out of bounds
  if (player.isOutOfBounds(canvas.height)) {
    triggerGameOver();
    return;
  }

  // Check collision with collectibles
  collectibles.forEach(collectible => {
    if (!collectible.collected && collectible.intersects(playerBounds)) {
      collectible.collect();
      // Collect all identical characters in the puzzle
      puzzle.collectPiece(collectible.pieceIndex);
      updateHUD();
      playCollectSound();

      // Remove any other on-screen collectibles of same character
      collectibles.forEach(c => {
        if (!c.collected && c.pieceText === collectible.pieceText) {
          c.collected = true;
        }
      });
    }
  });
}

// Trigger game over
function triggerGameOver() {
  // Increment fail counter each time the player fails
  failCount++;
  gameOver = true;
  gameStarted = false;
  
  // Show game over message
  showGameOverScreen();
}

// Show game over screen
function showGameOverScreen() {
  // Draw semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Game over text
  ctx.fillStyle = '#FF6B6B';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
  
  // Instructions
  ctx.fillStyle = '#FFF';
  ctx.font = '28px Arial';
  ctx.fillText('Click or press SPACE to retry', canvas.width / 2, canvas.height / 2 + 30);
  
  // Progress
  ctx.font = '20px Arial';
  ctx.fillStyle = '#FFD93D';
  ctx.fillText(
    `Collected: ${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`,
    canvas.width / 2,
    canvas.height / 2 + 80
  );

  // Show fail counter on game over if greater than zero
  if (failCount > 0) {
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`Fails: ${failCount}`, canvas.width / 2, canvas.height / 2 + 120);
  }
}

// Reset game (on retry after game over)
function resetGame() {
  // Reset puzzle collected state (keep spaces collected)
  puzzle.resetCollected();
  
  // Restart the game
  startGame();
  
  // Update HUD
  updateHUD();
}

// Simple collect sound effect
function playCollectSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Audio API not supported, silently fail
  }
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw world (background)
  world.draw(ctx);
  
  // Draw obstacles
  obstacles.forEach(obstacle => obstacle.draw(ctx));
  
  // Draw collectibles
  collectibles.forEach(collectible => collectible.draw(ctx));
  
  // Draw player
  player.draw(ctx);
  
  // Draw game over overlay if needed
  if (gameOver) {
    showGameOverScreen();
  }
}

// Show victory screen
function showVictory() {
  victoryScreen.classList.remove('hidden');
  solvedPhrase.textContent = puzzle.originalPhrase;
  // Show fail counter on victory screen if > 0
  if (failCount > 0 && failCountDisplay) {
    failCountDisplay.textContent = `Fails: ${failCount}`;
    failCountDisplay.classList.remove('hidden');
  } else if (failCountDisplay) {
    failCountDisplay.classList.add('hidden');
  }
}

// Event listeners
startBtn.addEventListener('click', startGame);

playAgainBtn.addEventListener('click', () => {
  window.location.href = 'sender.html';
});

// Initialize when page loads
init();
