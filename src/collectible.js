/**
 * Collectible class - represents a puzzle piece in the game world
 */

export class Collectible {
  constructor(x, y, pieceIndex, pieceText) {
    this.x = x;
    this.y = y;
    this.pieceIndex = pieceIndex;
    this.pieceText = pieceText;
    this.width = 40;
    this.height = 40;
    this.collected = false;
    this.offScreen = false;
    this.scrollSpeed = 3; // Horizontal movement speed
    
    // Visual properties
    this.color = '#FFD93D';
    this.bobOffset = 0;
    this.bobSpeed = 0.1;
    this.rotation = 0;
    this.rotationSpeed = 0.05;
  }
  
  /**
   * Update collectible animation and position
   */
  update() {
    // Move left (Flappy Bird style)
    this.x -= this.scrollSpeed;
    
    // Bobbing animation
    this.bobOffset += this.bobSpeed;
    
    // Rotation animation
    this.rotation += this.rotationSpeed;
    
    // Check if off screen to the left
    if (this.x + this.width < 0) {
      this.offScreen = true;
    }
  }
  
  /**
   * Draw the collectible
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.collected) return;

    const displayY = this.y + Math.sin(this.bobOffset) * 5;

    ctx.save();

    // Reset state
    ctx.globalAlpha = 1;

    ctx.translate(this.x + this.width / 2, displayY + this.height / 2);
    ctx.rotate(this.rotation);

    // Outer glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;

    // Draw collectible background
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw inner circle
    ctx.fillStyle = '#FFF5CC';
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw the piece text
    ctx.fillStyle = '#1E3A5F';
    ctx.font = "bold 22px 'Secular One', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.pieceText, 0, 0);

    ctx.restore();

    // Draw sparkles
    this.drawSparkles(ctx, displayY);
  }
  
  /**
   * Draw sparkle effects around collectible
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} displayY
   */
  drawSparkles(ctx, displayY) {
    const sparklePositions = [
      { x: -15, y: -15 },
      { x: 15, y: -15 },
      { x: -15, y: 15 },
      { x: 15, y: 15 }
    ];

    sparklePositions.forEach((pos, i) => {
      const offset = Math.sin(this.bobOffset + i) * 3;
      const sparkleX = this.x + this.width / 2 + pos.x + offset;
      const sparkleY = displayY + this.height / 2 + pos.y + offset;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FFF';
      ctx.translate(sparkleX, sparkleY);
      ctx.rotate(this.rotation + i);

      // Draw star shape
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(1, -1);
      ctx.lineTo(3, 0);
      ctx.lineTo(1, 1);
      ctx.lineTo(0, 3);
      ctx.lineTo(-1, 1);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-1, -1);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }
  
  /**
   * Get bounding box for collision detection
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y + Math.sin(this.bobOffset) * 5,
      width: this.width,
      height: this.height
    };
  }
  
  /**
   * Check if this collectible intersects with another bounding box
   * @param {{x: number, y: number, width: number, height: number}} bounds
   * @returns {boolean}
   */
  intersects(bounds) {
    const myBounds = this.getBounds();
    return (
      myBounds.x < bounds.x + bounds.width &&
      myBounds.x + myBounds.width > bounds.x &&
      myBounds.y < bounds.y + bounds.height &&
      myBounds.y + myBounds.height > bounds.y
    );
  }
  
  /**
   * Mark this collectible as collected
   */
  collect() {
    this.collected = true;
  }
  
  /**
   * Check if collectible is off screen
   * @returns {boolean}
   */
  isOffScreen() {
    return this.offScreen;
  }
}
