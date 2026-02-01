# Birdle

## Game Overview
A Flappy Bird-style word puzzle game where players navigate through obstacles while collecting letters to reveal a hidden phrase.

## Recent Refactoring: Platformer → Flappy Bird

### Files Modified

#### 1. **src/puzzle.js** - Enhanced Space Handling
- **Added**: `autoCollectSpaces()` - Automatically marks all spaces as collected when puzzle is created
- **Added**: `resetCollected()` - Resets all non-space pieces to uncollected (used on game over)
- **Added**: `getNonSpaceCount()` - Returns count of collectible (non-space) pieces
- **Added**: `getCollectedNonSpaceCount()` - Returns count of collected non-space pieces
- **Added**: `getNonSpaceIndices()` - Returns array of indices for non-space pieces
- **Why**: Spaces are no longer collectible objects; they appear in the HUD from the start

#### 2. **src/player.js** - Complete Refactor to Flappy Bird Movement
- **Removed**: Horizontal movement (left/right controls)
- **Removed**: Platform collision detection
- **Removed**: Ground collision detection
- **Added**: `flap()` - Applies upward impulse when player "flaps"
- **Added**: `reset()` - Resets player to initial position and velocity
- **Added**: `isOutOfBounds()` - Checks if player hit top/bottom screen bounds
- **Changed**: `update()` now only handles vertical movement with gravity
- **Changed**: Player stays at fixed X position (center-left of screen)
- **Changed**: Visual appearance to look like a bird with rotation based on velocity
- **Why**: Player now only moves vertically; obstacles scroll horizontally past the player

#### 3. **src/world.js** - Simplified Background
- **Removed**: Ground tiles and scrolling
- **Removed**: `scrollSpeed` and `scrollOffset` tracking
- **Removed**: Ground drawing and tile management
- **Simplified**: `update()` now only animates clouds slowly
- **Simplified**: `draw()` now only draws sky gradient and clouds
- **Why**: World no longer scrolls; obstacles move instead

#### 4. **src/collectible.js** - Horizontal Movement
- **Changed**: `update()` no longer takes `scrollSpeed` parameter
- **Added**: Internal `scrollSpeed` property for self-movement
- **Changed**: Collectibles now move themselves left across the screen
- **Why**: Collectibles are part of the horizontal stream of objects

#### 5. **src/obstacle.js** - NEW FILE
- **Purpose**: Flappy Bird-style pipe obstacles
- **Key Methods**:
  - `update()` - Moves obstacle left
  - `draw()` - Renders top and bottom pipes with gap in middle
  - `collidesWith(bounds)` - Checks if player collides with pipes
  - `hasPassed(playerX)` - Detects when player successfully passes obstacle
  - `getGapBounds()` - Returns gap location (useful for placing collectibles)
- **Why**: Core obstacle mechanic for Flappy Bird gameplay

#### 6. **src/game.js** - Complete Gameplay Refactor
**Removed Platformer Systems**:
- Platform spawning and management
- Horizontal player movement handling
- Ground collision detection
- Distance-based spawning tied to scrolling world

**Added Flappy Bird Systems**:
- Fixed player X position (PLAYER_X constant)
- Obstacle (pipe) spawning at regular intervals
- Vertical-only player movement
- Out-of-bounds detection (top/bottom of screen)
- Game over and restart mechanics
- Click/tap controls in addition to space bar

**Space Handling**:
- Only non-space pieces are added to `piecesToSpawn` queue
- HUD shows spaces from the start using `puzzle.getReconstructedPhrase()`
- Progress tracking uses `getNonSpaceCount()` and `getCollectedNonSpaceCount()`

**Game Over & Restart Flow**:
- `triggerGameOver()` - Called on collision with obstacle or screen bounds
- `showGameOverScreen()` - Displays game over message with retry instructions
- `resetGame()` - Resets puzzle (via `puzzle.resetCollected()`), player, obstacles, and collectibles
- **Important**: On restart, spaces remain "collected" while letters reset to uncollected

### How Movement System Now Works

**Flappy Bird Physics**:
1. Player has vertical position `y` and vertical velocity `velocityY`
2. Each frame: `velocityY += gravity` (gravity pulls player down)
3. Each frame: `y += velocityY` (velocity affects position)
4. On flap/jump: `velocityY = flapStrength` (negative value shoots player up)
5. Player's X position is fixed at `PLAYER_X` (150 pixels from left)

**Horizontal Scrolling**:
1. Obstacles spawn at `canvas.width + 50` (off right edge)
2. Each frame, obstacles move left by `scrollSpeed` (3 pixels)
3. Collectibles also spawn from right and move left
4. When objects reach `x < 0`, they're marked as off-screen and removed

**No More Platforms**:
- Platform.js still exists in codebase but is unused
- No platform collision detection
- No ground to land on
- Player must stay airborne by flapping

### How Spaces Are Treated

**In Puzzle Class**:
- When `Puzzle` is constructed, `autoCollectSpaces()` is immediately called
- This marks all space characters as "collected" from the start
- Spaces are never added to the spawn queue

**In Game Logic**:
- `piecesToSpawn = puzzle.getNonSpaceIndices()` - only gets non-space pieces
- Collectibles are only created for letters/characters, never for spaces
- HUD uses `puzzle.getReconstructedPhrase()` which shows:
  - Collected characters as themselves
  - Uncollected characters as underscores
  - **Spaces as actual spaces** (because they're always collected)

**On Reset**:
- `puzzle.resetCollected()` resets all pieces EXCEPT spaces
- Spaces remain "collected" so they still appear in HUD after game over

### How Restart Logic Works

**On Collision or Out of Bounds**:
1. `triggerGameOver()` is called
2. Sets `gameOver = true` and `gameStarted = false`
3. Draws game over overlay with retry message

**On Retry (Space or Click)**:
1. `resetGame()` is called
2. `puzzle.resetCollected()` - Resets all non-space pieces to uncollected
3. `startGame()` - Reinitializes game state:
   - Creates new player at starting position
   - Clears obstacles and collectibles arrays
   - Rebuilds `piecesToSpawn` queue from `getNonSpaceIndices()`
   - Shuffles spawn order for variety
   - Resets frame counter and spawn positions
4. `updateHUD()` - Updates display to show reset progress

**What Persists**:
- The original phrase from the URL (never changes)
- Spaces remain "collected" in the puzzle state
- HUD structure remains the same

**What Resets**:
- All non-space characters back to uncollected
- Player position and velocity
- All obstacles and collectibles cleared
- Score and frame counter
- Spawn queues rebuilt

## Controls
- **Space Bar** or **Click/Tap** - Flap/jump upward
- **Space/Click when game over** - Retry
- **No horizontal movement** - Player stays at fixed X position

## Game Mechanics
1. Navigate vertically through gaps in obstacles (pipes)
2. Collect letters that appear on screen
3. Avoid hitting obstacles or screen bounds
4. Collect all letters to reveal the complete phrase
5. If you fail, the game fully resets (except spaces stay visible)
