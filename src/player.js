/**
 * Player class - Flappy Bird-style vertical movement with gravity
 */

export class Player {
  constructor(x, y, opts = {}) {
    // Fixed X position (center-left of screen)
    this.x = x;
    this.y = y;
    this.initialY = y; // Store initial position for reset
    this.width = 40;
    this.height = 40; // Made square for Flappy Bird style
    this.velocityY = 0;
    this.gravity = typeof opts.gravity === 'number' ? opts.gravity : 0.6;
    this.flapStrength = typeof opts.flapStrength === 'number' ? opts.flapStrength : -10; // Upward impulse on jump/flap
    this.emoji = opts.emoji || '🐦';
    this.rotation = 0; // Visual rotation based on velocity
  }

  /**
   * Update player physics (Flappy Bird style - vertical only)
   * @param {number} canvasHeight - Height of canvas for bounds checking
   */
  update(canvasHeight) {
    // Apply gravity
    this.velocityY += this.gravity;

    // Apply velocity
    this.y += this.velocityY;

    // Calculate rotation based on velocity (for visual effect)
    // Smoothly interpolate rotation toward velocity-based target
    const targetRotation = Math.min(Math.max(this.velocityY * 0.05, -0.5), 0.5);
    this.rotation += (targetRotation - this.rotation) * 0.15;

    // Keep player within screen bounds (but don't reset on collision - game should handle that)
    // Just clamp the position
    if (this.y < 0) {
      this.y = 0;
      this.velocityY = 0;
    }
    if (this.y + this.height > canvasHeight) {
      this.y = canvasHeight - this.height;
      this.velocityY = 0;
    }
  }

  /**
   * Make player flap (jump upward)
   */
  flap() {
    // Snap tilt up immediately for a "kick" effect
    this.rotation = -0.4;
    this.velocityY = this.flapStrength;
  }

  /**
   * Reset player to initial position and state
   */
  reset() {
    this.y = this.initialY;
    this.velocityY = 0;
    this.rotation = 0;
  }

  /**
   * Draw the player
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();

    // Translate to player center for rotation
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    // Draw emoji character
    ctx.font = `${this.width * 1.2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);

    ctx.restore();
  }

  /**
   * Get bounding box for collision detection
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Check if player is out of bounds (top or bottom of screen)
   * @param {number} canvasHeight
   * @returns {boolean}
   */
  isOutOfBounds(canvasHeight) {
    return this.y < 0 || this.y + this.height > canvasHeight;
  }
}
