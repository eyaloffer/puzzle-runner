import { decodeFromUrlSafe } from './utils/urlEncoding.js';
import { Puzzle } from './puzzle.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Collectible } from './collectible.js';
import { Obstacle } from './obstacle.js';
import { ParticleSystem } from './particles.js';
import { getTheme } from './themes.js';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const encodedPhrase = urlParams.get('p');
const playerEmoji = urlParams.get('e') || '🐦';
const themeId = urlParams.get('t') || 'classic';

// Get theme configuration
const theme = getTheme(themeId);
console.log('Theme ID:', themeId);
console.log('Theme loaded:', theme);

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
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
const shareTwitterBtn = document.getElementById('shareTwitter');
const shareWhatsAppBtn = document.getElementById('shareWhatsApp');
const timerDisplay = document.getElementById('timerDisplay');
const completionStats = document.getElementById('completionStats');

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

// Particle system for death effects
let particleSystem = new ParticleSystem();

// Session timer (persists across retries)
let sessionStartTime = null;
let completionTime = null;

// Flappy Bird style constants (values may be overridden for mobile)
let PLAYER_X = 150; // Fixed X position for player
let OBSTACLE_SPAWN_DISTANCE = 350; // Distance between obstacles (in pixels)
let GAP_SIZE = 200; // Size of gap in obstacles
let MIN_GAP_Y = 150; // Minimum gap center Y
let SCROLL_SPEED = 3; // Default horizontal movement speed for obstacles/collectibles
let PLAYER_GRAVITY = 0.6;
let PLAYER_FLAP = -8;
let COLLECTIBLE_SPAWN_FRAMES = 120; // How often to attempt collectible spawn (in frames)

let lastObstacleX = 0; // Track last obstacle X position

// Logical canvas dimensions (for game logic, separate from DPR-scaled physical pixels)
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

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
  PLAYER_FLAP = -9.5; // adjusted flap strength
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

    // Track decoded phrase and theme in analytics (production only)
    if (typeof gtag !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      gtag('event', 'puzzle_played', {
        'phrase': phrase,
        'theme': themeId
      });
    }

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

// Resize canvas to fill available space with high DPI support
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  // Get the HUD height to calculate available space
  const hud = document.getElementById('hud');
  const hudHeight = hud ? hud.offsetHeight : 0;

  // Canvas fills the remaining space below the HUD
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight - hudHeight;

  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Confetti canvas covers entire viewport
  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confettiCanvas.style.width = window.innerWidth + 'px';
  confettiCanvas.style.height = window.innerHeight + 'px';
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (world) {
    world.resize(canvasWidth, canvasHeight);
  }

  if (!gameStarted && puzzle) {
    drawInitialScreen();
  }
}

// Draw initial screen before game starts
function drawInitialScreen() {
  // Draw sky gradient using theme colors
  const skyColors = theme?.sky?.gradient || ['#87CEEB', '#B0E0F0', '#E0F6FF'];
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);

  if (skyColors.length === 3) {
    gradient.addColorStop(0, skyColors[0]);
    gradient.addColorStop(0.5, skyColors[1]);
    gradient.addColorStop(1, skyColors[2]);
  } else {
    // Fallback for different gradient lengths
    skyColors.forEach((color, index) => {
      gradient.addColorStop(index / (skyColors.length - 1), color);
    });
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

// Update HUD display
function updateHUD() {
  piecesDisplay.textContent = puzzle.getReconstructedPhrase();
  progressText.textContent = `${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`;

  // Apply RTL for Hebrew phrases
  const hasHebrew = /[\u0590-\u05FF]/.test(puzzle.originalPhrase);
  piecesDisplay.style.direction = hasHebrew ? 'rtl' : 'ltr';
}

// Start the game
function startGame() {
  // Cancel any existing game loop to prevent double-speed bug
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Cancel any ongoing death animation
  if (deathAnimationId) {
    cancelAnimationFrame(deathAnimationId);
    deathAnimationId = null;
    deathAnimationStart = 0;
  }

  // Clear particle system
  particleSystem.clear();

  gameStarted = true;
  gameOver = false;
  instructions.classList.add('hidden');

  // Start session timer only on first start (not on retry)
  if (sessionStartTime === null) {
    sessionStartTime = performance.now();
  }

  // Create game objects with theme
  world = new World(canvasWidth, canvasHeight, theme);
  player = new Player(PLAYER_X, canvasHeight / 2, { gravity: PLAYER_GRAVITY, flapStrength: PLAYER_FLAP, emoji: playerEmoji, theme });
  
  // Initialize pieces to spawn - only one index per distinct non-space character
  piecesToSpawn = puzzle.getUniqueNonSpaceIndices().slice();
  shuffleArray(piecesToSpawn);
  
  // Reset game state
  collectibles = [];
  obstacles = [];
  score = 0;
  frameCount = 0;
  lastObstacleX = canvasWidth; // Start with first obstacle off screen
  
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

  // Detect if phrase contains Hebrew characters for RTL support
  const hasHebrew = /[\u0590-\u05FF]/.test(puzzle.originalPhrase);
  guessHint.setAttribute('dir', hasHebrew ? 'rtl' : 'ltr');
  guessInput.style.direction = hasHebrew ? 'rtl' : 'ltr';

  guessHint.innerHTML = phrase.split('').map(char => {
    if (char === ' ') {
      return '<span style="display:inline-block;width:0.5em;"></span>';
    }
    const isCollected = char !== '_';
    return `<span class="letter-slot" style="${isCollected ? 'border-bottom-color:#7EC8E3;color:#7EC8E3;' : ''}">${char}</span>`;
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
// Format time as M:SS or M:SS.s
function formatTime(ms, includeDecimal = false) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const decimal = Math.floor((totalSeconds % 1) * 10);

  if (includeDecimal) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${decimal}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update timer display
function updateTimer() {
  if (sessionStartTime !== null && timerDisplay) {
    const elapsed = performance.now() - sessionStartTime;
    timerDisplay.textContent = formatTime(elapsed);
  }
}

function gameLoop() {
  if (!gameStarted || gameOver || gamePaused) return;

  // Update timer
  updateTimer();

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
  player.update(canvasHeight);
  
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
    if (lastObstacle.x < canvasWidth - OBSTACLE_SPAWN_DISTANCE) {
      spawnSingleObstacle();
    }
  }
}

// Spawn a single obstacle
function spawnSingleObstacle() {
  const maxGapY = canvasHeight - MIN_GAP_Y - 50;
  const gapY = MIN_GAP_Y + Math.random() * (maxGapY - MIN_GAP_Y);

  const obstacle = new Obstacle(canvasWidth + 50, canvasHeight, gapY, GAP_SIZE, theme);
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
  spawnY = Math.max(10, Math.min(canvasHeight - 50, spawnY));

  const collectible = new Collectible(spawnX, spawnY, nextIndex, piece, theme);
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
  if (player.isOutOfBounds(canvasHeight)) {
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

      // Create sparkle effect at collectible position
      particleSystem.createCollectSparkles(
        collectible.x + collectible.width / 2,
        collectible.y + collectible.height / 2
      );

      // Remove any other on-screen collectibles of same character
      collectibles.forEach(c => {
        if (!c.collected && c.pieceText === collectible.pieceText) {
          c.collected = true;
        }
      });

      // Check if this was the last letter needed
      const isLastLetter = puzzle.isComplete();

      if (isLastLetter) {
        // Special effect for last letter
        playVictoryChime();
        triggerLastLetterEffect();
      } else {
        playCollectSound();
      }

      // Trigger visual effect on player
      player.triggerCollectEffect();
    }
  });
}

// Trigger game over
function triggerGameOver() {
  // Increment fail counter each time the player fails
  failCount++;
  gameOver = true;
  gameStarted = false;

  // Create death particle effects
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;

  // Player explosion particles with theme colors
  const deathColors = ['#5B9BD5', '#7EC8E3', '#FFD93D', '#FF6B6B', '#FFA94D', '#FFFFFF'];
  particleSystem.createDeathExplosion(playerCenterX, playerCenterY, deathColors);

  // Splash on nearby pipes
  particleSystem.createPipeSplash(obstacles, playerCenterX, playerCenterY, deathColors);

  // Screen shake - more intense
  particleSystem.startScreenShake(28, 550);

  // Play crash sound
  playCrashSound();

  // Start death animation loop (to show particles before game over screen)
  deathAnimationLoop();
}

// Show game over screen
function showGameOverScreen() {
  // Draw the scene behind the overlay (world, obstacles, remaining particles)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  world.draw(ctx);
  obstacles.forEach(obstacle => obstacle.draw(ctx));
  particleSystem.splashParticles.forEach(p => p.draw(ctx));
  collectibles.forEach(collectible => collectible.draw(ctx));
  particleSystem.particles.forEach(p => p.draw(ctx));

  // Draw semi-transparent overlay
  ctx.fillStyle = 'rgba(30, 58, 95, 0.85)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Game over text
  ctx.fillStyle = '#FF6B6B';
  ctx.font = "bold 52px 'Secular One', sans-serif";
  ctx.fillText('Game Over!', canvasWidth / 2, canvasHeight / 2 - 60);

  // Instructions
  ctx.fillStyle = '#FFF';
  ctx.font = "24px 'Secular One', sans-serif";
  ctx.fillText('Click or press SPACE to retry', canvasWidth / 2, canvasHeight / 2 + 10);

  // Progress
  ctx.font = "20px 'Secular One', sans-serif";
  ctx.fillStyle = '#7EC8E3';
  ctx.fillText(
    `Collected: ${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`,
    canvasWidth / 2,
    canvasHeight / 2 + 60
  );

  // Show fail counter on game over if greater than zero
  if (failCount > 0) {
    ctx.font = "18px 'Secular One', sans-serif";
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`Fails: ${failCount}`, canvasWidth / 2, canvasHeight / 2 + 100);
  }
}

// Reset game (on retry after game over)
function resetGame() {
  // Cancel any ongoing death animation
  if (deathAnimationId) {
    cancelAnimationFrame(deathAnimationId);
    deathAnimationId = null;
    deathAnimationStart = 0;
  }

  // Clear particle system
  particleSystem.clear();

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

// Crash/death sound effect
function playCrashSound() {
  try {
    const audio = new Audio('src/assets/skadoosh.mp3');
    audio.volume = 0.7;
    audio.play();
  } catch (e) {
    // Audio not supported, silently fail
  }
}

// Death animation loop - shows particle effects before game over screen
let deathAnimationId = null;
let deathAnimationStart = 0;
const DEATH_ANIMATION_DURATION = 2000; // ms before showing game over screen

function deathAnimationLoop() {
  if (deathAnimationStart === 0) {
    deathAnimationStart = performance.now();
  }

  const elapsed = performance.now() - deathAnimationStart;

  // Update and draw particles with screen shake
  drawDeathFrame();

  // Continue until animation duration is complete and particles settle
  if (elapsed < DEATH_ANIMATION_DURATION || particleSystem.isActive()) {
    deathAnimationId = requestAnimationFrame(deathAnimationLoop);
  } else {
    // Animation complete, show game over screen
    deathAnimationStart = 0;
    showGameOverScreen();
  }
}

// Draw a single frame during death animation
function drawDeathFrame() {
  // Get screen shake offset
  const shake = particleSystem.getShakeOffset();

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Apply screen shake
  ctx.save();
  ctx.translate(shake.x, shake.y);

  // Draw world (background)
  world.draw(ctx);

  // Draw obstacles with splash particles
  obstacles.forEach(obstacle => obstacle.draw(ctx));

  // Draw splash particles on pipes
  particleSystem.splashParticles.forEach(p => p.draw(ctx));

  // Draw collectibles
  collectibles.forEach(collectible => collectible.draw(ctx));

  // Update and draw death particles
  particleSystem.update();
  particleSystem.particles.forEach(p => p.draw(ctx));

  ctx.restore();
}

// Victory chime for last letter
function playVictoryChime() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 - triumphant arpeggio

    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = audioContext.currentTime + i * 0.08;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
  } catch (e) {
    // Audio API not supported, silently fail
  }
}

// Last letter special visual effect
let lastLetterEffectActive = false;
let lastLetterEffectStart = 0;

function triggerLastLetterEffect() {
  lastLetterEffectActive = true;
  lastLetterEffectStart = performance.now();

  // Haptic feedback on mobile
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200]);
  }
}

function drawLastLetterEffect() {
  if (!lastLetterEffectActive) return;

  const elapsed = performance.now() - lastLetterEffectStart;
  const duration = 600;

  if (elapsed > duration) {
    lastLetterEffectActive = false;
    return;
  }

  const progress = elapsed / duration;

  // Screen flash effect (white to transparent)
  const flashOpacity = Math.max(0, 0.6 * (1 - progress * 2));
  if (flashOpacity > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Expanding rings effect from center
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringProgress = Math.min(1, (progress * 2) - (i * 0.15));
    if (ringProgress > 0 && ringProgress < 1) {
      const radius = ringProgress * Math.max(canvasWidth, canvasHeight) * 0.8;
      const ringOpacity = (1 - ringProgress) * 0.4;

      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(126, 200, 227, ${ringOpacity})`;
      ctx.lineWidth = 8 * (1 - ringProgress);
      ctx.stroke();
    }
  }

  // Golden sparkle particles
  const sparkleCount = 12;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2;
    const dist = progress * 200 + 50;
    const x = canvasWidth / 2 + Math.cos(angle) * dist;
    const y = canvasHeight / 2 + Math.sin(angle) * dist;
    const size = 6 * (1 - progress);
    const opacity = 1 - progress;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
    ctx.fill();
  }
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw world (background)
  world.draw(ctx);

  // Draw obstacles
  obstacles.forEach(obstacle => obstacle.draw(ctx));

  // Draw collectibles
  collectibles.forEach(collectible => collectible.draw(ctx));

  // Draw player
  player.draw(ctx);

  // Update and draw sparkle particles
  particleSystem.update();
  particleSystem.sparkleParticles.forEach(p => p.draw(ctx));

  // Draw last letter celebration effect
  drawLastLetterEffect();

  // Draw game over overlay if needed
  if (gameOver) {
    showGameOverScreen();
  }
}

// Confetti system
let confettiParticles = [];
let confettiAnimationId = null;

const CONFETTI_COLORS = ['#5B9BD5', '#7EC8E3', '#4A90D9', '#E8F4FD', '#48bb78', '#FFD93D', '#FF6B6B', '#A8D8EA'];

function createConfetti() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  confettiParticles = [];

  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      width: Math.random() * 10 + 5,
      height: Math.random() * 6 + 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      velocityX: (Math.random() - 0.5) * 3,
      velocityY: Math.random() * 3 + 2,
      gravity: 0.1
    });
  }
}

function updateConfetti() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  confettiCtx.clearRect(0, 0, width, height);

  let activeParticles = 0;

  confettiParticles.forEach(p => {
    p.velocityY += p.gravity;
    p.x += p.velocityX;
    p.y += p.velocityY;
    p.rotation += p.rotationSpeed;

    if (p.y < height + 50) {
      activeParticles++;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      confettiCtx.restore();
    }
  });

  if (activeParticles > 0) {
    confettiAnimationId = requestAnimationFrame(updateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, width, height);
  }
}

function startConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
  }
  createConfetti();
  updateConfetti();
}

// Show victory screen
function showVictory() {
  // Calculate completion time
  completionTime = performance.now() - sessionStartTime;

  victoryScreen.classList.remove('hidden');
  solvedPhrase.textContent = puzzle.originalPhrase;

  // Show completion stats (time and fails on separate lines)
  if (completionStats) {
    const timeStr = formatTime(completionTime, true);
    const failsHtml = failCount === 0
      ? '<span class="flawless">Flawless!</span>'
      : `<span class="fails">${failCount}</span> fail${failCount > 1 ? 's' : ''}`;
    completionStats.innerHTML = `
      <div class="stat-row"><span class="stat-label">Time:</span> <span class="time">${timeStr}</span></div>
      <div class="stat-row"><span class="stat-label">Attempts:</span> ${failsHtml}</div>
    `;
  }

  // Start confetti celebration
  startConfetti();
}

// Event listeners
startBtn.addEventListener('click', startGame);

playAgainBtn.addEventListener('click', () => {
  window.location.href = 'sender.html';
});

// Share button handlers
// Generate share text with stats
function getShareText() {
  const timeStr = formatTime(completionTime, true);
  const failsText = failCount === 0 ? 'FLAWLESS' : `${failCount} fail${failCount > 1 ? 's' : ''}`;
  return `I solved this Birdle in ${timeStr} (${failsText})! Can you beat my time?`;
}

shareTwitterBtn.addEventListener('click', () => {
  const text = getShareText();
  const url = window.location.href;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
});

shareWhatsAppBtn.addEventListener('click', () => {
  const text = `${getShareText()}\n${window.location.href}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
});

// Initialize when page loads
init();
