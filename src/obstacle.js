/**
 * Obstacle class - Flappy Bird-style pipes/obstacles
 */

export class Obstacle {
  constructor(x, canvasHeight, gapY, gapSize = 150) {
    this.x = x;
    this.canvasHeight = canvasHeight;
    this.gapY = gapY; // Center Y of the gap
    this.gapSize = gapSize;
    this.width = 60;
    this.scrollSpeed = 3;
    this.offScreen = false;
    this.passed = false; // Track if player has passed this obstacle
    
    // Calculate top and bottom pipe heights
    this.topHeight = gapY - gapSize / 2;
    this.bottomY = gapY + gapSize / 2;
    this.bottomHeight = canvasHeight - this.bottomY;
  }
  
  /**
   * Update obstacle position
   */
  update() {
    this.x -= this.scrollSpeed;
    
    // Check if off screen
    if (this.x + this.width < 0) {
      this.offScreen = true;
    }
  }
  
  /**
   * Draw the obstacle (pipes)
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const capHeight = 30;
    const capOverhang = 5;
    
    // Create horizontal gradient for 3D pipe effect
    const pipeGradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    pipeGradient.addColorStop(0, '#2E7D32');    // dark green (left edge - shadow)
    pipeGradient.addColorStop(0.2, '#4CAF50');  // medium green
    pipeGradient.addColorStop(0.5, '#81C784');  // light green (center - highlight)
    pipeGradient.addColorStop(0.8, '#4CAF50');  // medium green
    pipeGradient.addColorStop(1, '#2E7D32');    // dark green (right edge - shadow)
    
    // Create gradient for caps (slightly darker/more contrast)
    const capGradient = ctx.createLinearGradient(this.x - capOverhang, 0, this.x + this.width + capOverhang, 0);
    capGradient.addColorStop(0, '#1B5E20');     // darker green (left edge)
    capGradient.addColorStop(0.15, '#388E3C');  // medium-dark green
    capGradient.addColorStop(0.5, '#66BB6A');   // lighter green (center highlight)
    capGradient.addColorStop(0.85, '#388E3C');  // medium-dark green
    capGradient.addColorStop(1, '#1B5E20');     // darker green (right edge)
    
    // Top pipe body
    ctx.fillStyle = pipeGradient;
    ctx.fillRect(this.x, 0, this.width, this.topHeight - capHeight);
    
    // Top pipe cap
    ctx.fillStyle = capGradient;
    ctx.fillRect(
      this.x - capOverhang,
      this.topHeight - capHeight,
      this.width + capOverhang * 2,
      capHeight
    );
    
    // Bottom pipe cap
    ctx.fillStyle = capGradient;
    ctx.fillRect(
      this.x - capOverhang,
      this.bottomY,
      this.width + capOverhang * 2,
      capHeight
    );
    
    // Bottom pipe body
    ctx.fillStyle = pipeGradient;
    ctx.fillRect(
      this.x,
      this.bottomY + capHeight,
      this.width,
      this.bottomHeight - capHeight
    );
    
    // Add subtle outline for definition
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 2;
    
    // Top pipe outline
    ctx.strokeRect(this.x, 0, this.width, this.topHeight - capHeight);
    ctx.strokeRect(
      this.x - capOverhang,
      this.topHeight - capHeight,
      this.width + capOverhang * 2,
      capHeight
    );
    
    // Bottom pipe outline
    ctx.strokeRect(
      this.x - capOverhang,
      this.bottomY,
      this.width + capOverhang * 2,
      capHeight
    );
    ctx.strokeRect(
      this.x,
      this.bottomY + capHeight,
      this.width,
      this.bottomHeight - capHeight
    );
    
    // Add inner highlight line on caps for extra 3D effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Top cap highlight
    ctx.beginPath();
    ctx.moveTo(this.x - capOverhang + 4, this.topHeight - capHeight + 4);
    ctx.lineTo(this.x + this.width + capOverhang - 4, this.topHeight - capHeight + 4);
    ctx.stroke();
    
    // Bottom cap highlight
    ctx.beginPath();
    ctx.moveTo(this.x - capOverhang + 4, this.bottomY + 4);
    ctx.lineTo(this.x + this.width + capOverhang - 4, this.bottomY + 4);
    ctx.stroke();
  }
  
  /**
   * Check if a bounding box collides with this obstacle
   * @param {{x: number, y: number, width: number, height: number}} bounds
   * @returns {boolean}
   */
  collidesWith(bounds) {
    // Check if player is within the X range of the pipe
    if (bounds.x + bounds.width > this.x && bounds.x < this.x + this.width) {
      // Check if player hits top pipe
      if (bounds.y < this.topHeight) {
        return true;
      }
      // Check if player hits bottom pipe
      if (bounds.y + bounds.height > this.bottomY) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if player has passed this obstacle
   * @param {number} playerX
   * @returns {boolean}
   */
  hasPassed(playerX) {
    if (!this.passed && playerX > this.x + this.width) {
      this.passed = true;
      return true;
    }
    return false;
  }
  
  /**
   * Check if obstacle is off screen
   * @returns {boolean}
   */
  isOffScreen() {
    return this.offScreen;
  }
  
  /**
   * Get the gap bounds (for placing collectibles)
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getGapBounds() {
    return {
      x: this.x,
      y: this.gapY - this.gapSize / 2,
      width: this.width,
      height: this.gapSize
    };
  }
}
