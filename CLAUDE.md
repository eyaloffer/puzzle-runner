# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Birdle is a Flappy Bird-style word puzzle game where players navigate through pipe obstacles while collecting letters to reveal a hidden phrase. The game is shareable via URL-encoded puzzle links.

## Commands

```bash
npm run dev      # Start Vite dev server with hot reload
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build locally
```

No test suite or linting configured.

## Architecture

### Entry Points
- **sender.html** → `src/sender.js`: Puzzle creator - user enters phrase, generates shareable URL
- **game.html** → `src/game.js`: Game player - decodes URL parameter and runs the game

### Core Modules (src/)
- **game.js**: Main game loop, state management, collision detection, spawning logic
- **puzzle.js**: Phrase tracking - splits into pieces, tracks collected/uncollected state
- **player.js**: Flappy Bird physics - fixed X position, vertical velocity with gravity and flap
- **obstacle.js**: Pipe obstacles that scroll left with configurable gap
- **collectible.js**: Letter items with rotation/bobbing animation
- **world.js**: Background rendering (sky gradient, parallax clouds)
- **utils/urlEncoding.js**: URL-safe base64 encoding for shareable links

Note: `platform.js` is deprecated/unused from a previous platformer version.

## Key Patterns

### Space Handling
Spaces are auto-collected in the Puzzle constructor and never spawned as collectibles. They always appear in the HUD from start. Reset logic must preserve space collection state.

### Duplicate Character Handling
When a letter is collected, `puzzle.collectPiece(index)` marks ALL instances of that character as collected. Only unique characters are spawned as collectibles (via `getUniqueNonSpaceIndices()`).

### Mobile Adaptation
`isMobileDevice()` detects touch devices and applies different physics constants:
- Slower scroll speed (2.2 vs 3)
- Larger gap size (260px vs 200px)
- Lower gravity (0.45 vs 0.6)
- Stronger flap (-12 vs -10)

### Mid-Game Guessing
Press G key or click "Guess" button to pause and attempt to guess the full phrase. Case-insensitive matching. Correct guess triggers immediate victory.

## Game Loop Flow

```
init() → decode URL, create Puzzle, setup listeners
startGame() → create Player/World, reset state, shuffle spawn order
gameLoop() → update() physics/spawning/collisions → draw() render all entities
triggerGameOver() → show retry overlay, increment fail counter
resetGame() → reset pieces (preserve spaces), restart game
```

## Tech Stack
- Vite 5.x (build tool)
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas 2D API
- No frameworks or external dependencies
