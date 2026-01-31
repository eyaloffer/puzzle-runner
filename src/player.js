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
    this.color = '#FFD93D';
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
    this.rotation = Math.min(Math.max(this.velocityY * 0.05, -0.5), 0.5);
    
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
    
    // Draw bird body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-5, 5, 12, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw beak
    ctx.fillStyle = '#FF6347';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(22, -3);
    ctx.lineTo(22, 3);
    ctx.closePath();
    ctx.fill();
    
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
