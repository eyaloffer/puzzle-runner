import { decodeFromUrlSafe } from './utils/urlEncoding.js';
import { Puzzle } from './puzzle.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Collectible } from './collectible.js';
import { Obstacle } from './obstacle.js';
import { ParticleSystem } from './particles.js';
import { getTheme } from './themes.js';
import { ImagePuzzle } from './imagePuzzle.js';
import { JigsawCollectible } from './jigsawCollectible.js';
import { loadAndResize } from './utils/imageProcessor.js';

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
const countdown = document.getElementById('countdown');
const countdownNumber = document.getElementById('countdownNumber');
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
const victoryImageCanvas = document.getElementById('victoryImageCanvas');
const instructionText = document.getElementById('instructionText');

// Image-mode state
let imageMode = false;
let imagePuzzle = null;
let imagePuzzleCanvas = null;
let usedFallback = false;

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
let isFirstStart = true; // Track if this is the first game start (for countdown)

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

// Mobile rendering quality settings
const IS_MOBILE = isMobileDevice();
let MOBILE_STAR_COUNT = 50;           // Reduced from 150 for mobile
let MOBILE_CLOUD_REDUCTION = 0.5;     // 50% fewer clouds on mobile
let MOBILE_PARTICLE_REDUCTION = 0.6;  // 40% fewer particles on mobile

// Apply mobile-friendly overrides
if (IS_MOBILE) {
  console.log('📱 Mobile device detected - applying physics and rendering optimizations');
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
async function init() {
  // Set controls hint based on device
  const controlsHint = document.getElementById('controlsHint');
  if (controlsHint) {
    if (isMobileDevice()) {
      controlsHint.innerHTML = '<strong>Tap</strong> to flap';
    } else {
      controlsHint.innerHTML = '<strong>Click</strong> or press <strong>SPACE</strong> to flap';
    }
  }

  // Detect puzzle mode from URL
  const mode = urlParams.get('m') || 'txt';

  if (mode === 'img') {
    // --- Image puzzle mode ---
    const imageUrl = urlParams.get('i') ? decodeURIComponent(urlParams.get('i')) : null;
    if (!imageUrl) {
      alert('No image found! Please use a valid link.');
      window.location.href = 'sender.html';
      return;
    }

    try {
      // Load image (with automatic fallback to cute dog on failure)
      const result = await loadAndResize(imageUrl, 800, 600);
      imagePuzzleCanvas = result.canvas;
      usedFallback = result.usedFallback;
      imageMode = true;

      // Create image puzzle (splits into 8 pieces)
      imagePuzzle = new ImagePuzzle(imagePuzzleCanvas);

      // Update instructions for image mode
      if (usedFallback) {
        instructionText.innerHTML = '<strong style="color:#FFD93D">Didn\'t manage to load the intended image but here\'s a cute dog</strong><br>Collect all the pieces to reveal the image!';
      } else {
        instructionText.textContent = 'Collect all the pieces to reveal the image!';
      }

      // Hide the guess button — no phrase to guess in image mode
      guessBtn.style.display = 'none';

      // Hide the phrase label in HUD, show only progress
      piecesDisplay.style.display = 'none';
    } catch (error) {
      console.error('Image puzzle init error:', error);
      alert('Failed to load puzzle image.');
      window.location.href = 'sender.html';
      return;
    }
  } else {
    // --- Text puzzle mode (existing logic) ---
    if (!encodedPhrase) {
      alert('No puzzle found! Please use a valid link from the sender page.');
      window.location.href = 'sender.html';
      return;
    }

    try {
      const phrase = decodeFromUrlSafe(encodedPhrase);
      console.log('Decoded phrase:', phrase);

      if (typeof gtag !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        gtag('event', 'puzzle_played', { 'phrase': phrase, 'theme': themeId });
      }

      puzzle = new Puzzle(phrase);
      console.log('Puzzle pieces:', puzzle.pieces);
      console.log('Non-space pieces to collect:', puzzle.getNonSpaceCount());
    } catch (error) {
      console.error('Error decoding phrase:', error);
      alert('Invalid puzzle link! Please check the URL.');
      window.location.href = 'sender.html';
      return;
    }
  }

  // Shared setup for both modes
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupInput();
  updateHUD();
  drawInitialScreen();
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
    } else if (e.code === 'KeyG' && gameStarted && !gameOver && !imageMode) {
      e.preventDefault();
      showGuessModal();
    }
  });
  
  // Mouse/touch input - Click/tap to flap
  // Use touchstart for iOS to prevent text selection and improve responsiveness
  const handleTap = (e) => {
    if (gamePaused) return;

    // Prevent default touch behavior (text selection, zoom, copy menu on iOS)
    e.preventDefault();

    if (!gameStarted) {
      startGame();
    } else if (gameOver) {
      resetGame();
    } else if (player) {
      player.flap();
    }
  };

  // Touch events for mobile (iOS/Android) - prevents 300ms delay and text selection
  canvas.addEventListener('touchstart', handleTap, { passive: false });

  // Click for desktop (fallback)
  canvas.addEventListener('click', (e) => {
    // Only handle click if not from touch (to avoid double-trigger)
    if (e.detail !== 0) {
      handleTap(e);
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

  if (!gameStarted && (puzzle || imagePuzzle)) {
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
  if (imageMode) {
    progressText.textContent = `${imagePuzzle.getCollectedCount()} / ${imagePuzzle.getTotalPieces()} pieces`;
  } else {
    if (puzzle.isComplete()) {
      piecesDisplay.textContent = '';
    } else {
      piecesDisplay.textContent = puzzle.getReconstructedPhrase();
    }
    progressText.textContent = `${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`;

    const hasHebrew = /[\u0590-\u05FF]/.test(puzzle.originalPhrase);
    piecesDisplay.style.direction = hasHebrew ? 'rtl' : 'ltr';
  }
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

  // Hide instructions
  instructions.classList.add('hidden');

  // Show countdown only on first start, skip on retries
  if (isFirstStart) {
    isFirstStart = false;
    showCountdown();
  } else {
    // Skip countdown on retry - initialize and start immediately
    world = new World(canvasWidth, canvasHeight, theme, IS_MOBILE, MOBILE_STAR_COUNT, MOBILE_CLOUD_REDUCTION);
    player = new Player(PLAYER_X, canvasHeight / 2, { gravity: PLAYER_GRAVITY, flapStrength: PLAYER_FLAP, emoji: playerEmoji, theme });

    // Quick pre-render
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    world.draw(ctx);

    beginGame();
  }
}

// Show countdown and pre-initialize game during countdown
function showCountdown() {
  countdown.classList.remove('hidden');
  countdownNumber.textContent = '3';

  // Create game objects early (during countdown) to pre-cache gradients
  world = new World(canvasWidth, canvasHeight, theme, IS_MOBILE, MOBILE_STAR_COUNT, MOBILE_CLOUD_REDUCTION);
  player = new Player(PLAYER_X, canvasHeight / 2, { gravity: PLAYER_GRAVITY, flapStrength: PLAYER_FLAP, emoji: playerEmoji, theme });

  // ENHANCED: Create sample obstacles and collectibles to cache their gradients
  // This forces the browser to cache obstacle/collectible gradients during countdown
  const sampleObstacles = [
    new Obstacle(canvasWidth, canvasHeight, 200, GAP_SIZE, theme),
    new Obstacle(canvasWidth + 350, canvasHeight, 400, GAP_SIZE, theme)
  ];
  const sampleCollectible = new Collectible(
    canvasWidth / 2, canvasHeight / 2, 'A', 0, theme
  );

  // Pre-render 15 frames instead of 3 to thoroughly cache all gradients
  // This is especially important for complex themes (space, evil) with heavy gradients
  function preRenderFrames(count) {
    if (count <= 0) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    world.draw(ctx);
    sampleObstacles.forEach(obs => obs.draw(ctx));
    sampleCollectible.draw(ctx);
    player.draw(ctx);

    requestAnimationFrame(() => preRenderFrames(count - 1));
  }

  preRenderFrames(15); // Render 15 frames to thoroughly cache gradients

  // Countdown sequence: 3 → 2 → 1 → GO! (extended to 1.5 seconds total)
  setTimeout(() => {
    countdownNumber.textContent = '2';
    // Trigger animation by removing and re-adding (forces restart)
    countdownNumber.style.animation = 'none';
    setTimeout(() => { countdownNumber.style.animation = ''; }, 10);
  }, 500); // Extended from 333ms

  setTimeout(() => {
    countdownNumber.textContent = '1';
    countdownNumber.style.animation = 'none';
    setTimeout(() => { countdownNumber.style.animation = ''; }, 10);
  }, 1000); // Extended from 666ms

  setTimeout(() => {
    // Hide countdown and start game
    countdown.classList.add('hidden');
    beginGame();
  }, 1500); // Extended from 1000ms (now 1.5 seconds total)
}

// Begin the actual game after countdown
function beginGame() {
  gameStarted = true;
  gameOver = false;

  // Start session timer only on first start (not on retry)
  if (sessionStartTime === null) {
    sessionStartTime = performance.now();
  }

  // Initialize pieces to spawn
  if (imageMode) {
    piecesToSpawn = imagePuzzle.getAllIndices();
  } else {
    piecesToSpawn = puzzle.getUniqueNonSpaceIndices().slice();
  }
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
  const puzzleComplete = imageMode ? imagePuzzle.isComplete() : puzzle.isComplete();
  if (puzzleComplete && gameStarted && !gameOver) {
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
  if (piecesToSpawn.length === 0) return;

  // Skip already-collected indices
  const collectedArr = imageMode ? imagePuzzle.collectedPieces : puzzle.collectedPieces;
  while (piecesToSpawn.length > 0 && collectedArr[piecesToSpawn[0]]) {
    piecesToSpawn.shift();
  }
  if (piecesToSpawn.length === 0) return;

  const nextIndex = piecesToSpawn.shift();

  const gap = obstacle.getGapBounds();
  const spawnX = obstacle.x + obstacle.width + 30;

  const padding = 12;
  const availableHeight = Math.max(0, gap.height - padding * 2);
  let spawnY = gap.y + padding + Math.random() * availableHeight;
  spawnY = Math.max(10, Math.min(canvasHeight - 50, spawnY));

  let collectible;
  if (imageMode) {
    const pieceData = imagePuzzle.getPiece(nextIndex);
    if (!pieceData) return;
    collectible = new JigsawCollectible(spawnX, spawnY, nextIndex, imagePuzzleCanvas, pieceData, theme);
  } else {
    const piece = puzzle.getPiece(nextIndex);
    if (piece == null) return;
    collectible = new Collectible(spawnX, spawnY, nextIndex, piece, theme);
    if (isMobileDevice()) {
      collectible.width = 48;
      collectible.height = 48;
    }
  }

  collectible.scrollSpeed = SCROLL_SPEED;
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
      const collectedArr = imageMode ? imagePuzzle.collectedPieces : puzzle.collectedPieces;
      if (!collectedArr[c.pieceIndex]) {
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

      // Mark collected in the appropriate puzzle
      if (imageMode) {
        imagePuzzle.collectPiece(collectible.pieceIndex);
      } else {
        puzzle.collectPiece(collectible.pieceIndex);
        // Remove any other on-screen collectibles of same character (text mode only)
        collectibles.forEach(c => {
          if (!c.collected && c.pieceText === collectible.pieceText) {
            c.collected = true;
          }
        });
      }
      updateHUD();

      // Create sparkle effect at collectible position
      particleSystem.createCollectSparkles(
        collectible.x + collectible.width / 2,
        collectible.y + collectible.height / 2
      );

      // Check if this was the last piece needed
      const isLastLetter = imageMode ? imagePuzzle.isComplete() : puzzle.isComplete();

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
  const progressLabel = imageMode
    ? `Collected: ${imagePuzzle.getCollectedCount()} / ${imagePuzzle.getTotalPieces()} pieces`
    : `Collected: ${puzzle.getCollectedNonSpaceCount()} / ${puzzle.getNonSpaceCount()} letters`;
  ctx.fillText(progressLabel, canvasWidth / 2, canvasHeight / 2 + 60);

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

  // Reset puzzle collected state
  if (imageMode) {
    imagePuzzle.resetCollected();
  } else {
    puzzle.resetCollected(); // keeps spaces collected
  }

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

  if (imageMode) {
    // Show the completed image instead of phrase
    solvedPhrase.classList.add('hidden');
    victoryImageCanvas.classList.remove('hidden');

    // Scale source image to fit the victory canvas (max 500×280)
    const maxW = 500, maxH = 280;
    const scaleX = maxW / imagePuzzleCanvas.width;
    const scaleY = maxH / imagePuzzleCanvas.height;
    const scale = Math.min(scaleX, scaleY);
    victoryImageCanvas.width = Math.round(imagePuzzleCanvas.width * scale);
    victoryImageCanvas.height = Math.round(imagePuzzleCanvas.height * scale);

    const vCtx = victoryImageCanvas.getContext('2d');
    vCtx.drawImage(imagePuzzleCanvas, 0, 0, victoryImageCanvas.width, victoryImageCanvas.height);
  } else {
    solvedPhrase.textContent = puzzle.originalPhrase;
  }

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
