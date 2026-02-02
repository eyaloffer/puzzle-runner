/**
 * Obstacle class - Theme-based obstacles (pipes, spikes, coral, asteroids)
 */

export class Obstacle {
  constructor(x, canvasHeight, gapY, gapSize = 150, theme = null) {
    this.x = x;
    this.canvasHeight = canvasHeight;
    this.gapY = gapY; // Center Y of the gap
    this.gapSize = gapSize;
    this.width = 60;
    this.scrollSpeed = 3;
    this.offScreen = false;
    this.passed = false; // Track if player has passed this obstacle
    this.theme = theme;
    this.rotation = Math.random() * Math.PI * 2; // For rotating asteroids

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

    // Rotate asteroids
    if (this.theme?.obstacles?.rotate) {
      this.rotation += 0.02;
    }

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
    if (!this.theme) {
      this.drawPipe(ctx); // Fallback to classic pipes
      return;
    }

    const obstacleType = this.theme.obstacles?.type || 'pipe';

    switch (obstacleType) {
      case 'spike':
        this.drawSpike(ctx);
        break;
      case 'coral':
        this.drawCoral(ctx);
        break;
      case 'asteroid':
        this.drawAsteroid(ctx);
        break;
      case 'pipe':
      default:
        this.drawPipe(ctx);
        break;
    }
  }

  /**
   * Draw classic pipe obstacles
   * @param {CanvasRenderingContext2D} ctx
   */
  drawPipe(ctx) {
    const capHeight = this.theme?.obstacles?.capHeight || 30;
    const capOverhang = this.theme?.obstacles?.capOverhang || 5;
    const colors = this.theme?.obstacles?.colors || ['#2E7D32', '#4CAF50', '#81C784', '#4CAF50', '#2E7D32'];
    const capColors = this.theme?.obstacles?.capColors || ['#1B5E20', '#388E3C', '#66BB6A', '#388E3C', '#1B5E20'];
    const outlineColor = this.theme?.obstacles?.outlineColor || '#1B5E20';
    
    // Create horizontal gradient for 3D pipe effect
    const pipeGradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    pipeGradient.addColorStop(0, colors[0]);
    pipeGradient.addColorStop(0.2, colors[1]);
    pipeGradient.addColorStop(0.5, colors[2]);
    pipeGradient.addColorStop(0.8, colors[3]);
    pipeGradient.addColorStop(1, colors[4]);

    // Create gradient for caps (slightly darker/more contrast)
    const capGradient = ctx.createLinearGradient(this.x - capOverhang, 0, this.x + this.width + capOverhang, 0);
    capGradient.addColorStop(0, capColors[0]);
    capGradient.addColorStop(0.15, capColors[1]);
    capGradient.addColorStop(0.5, capColors[2]);
    capGradient.addColorStop(0.85, capColors[3]);
    capGradient.addColorStop(1, capColors[4]);
    
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
    ctx.strokeStyle = outlineColor;
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
      // For asteroids, account for the full column height
      if (this.theme?.obstacles?.type === 'asteroid') {
        const asteroidSize = 35;
        const topExtent = this.topHeight - 30 - asteroidSize;
        const bottomExtent = this.bottomY + 30 + asteroidSize;

        // Check if player hits top column (extends from 0 to topExtent)
        if (bounds.y < topExtent) {
          return true;
        }
        // Check if player hits bottom column (extends from bottomExtent to canvas height)
        if (bounds.y + bounds.height > bottomExtent) {
          return true;
        }
      } else {
        // Standard collision for pipes, spikes, coral
        // Check if player hits top pipe
        if (bounds.y < this.topHeight) {
          return true;
        }
        // Check if player hits bottom pipe
        if (bounds.y + bounds.height > this.bottomY) {
          return true;
        }
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

  /**
   * Draw spike obstacles (Evil theme)
   * @param {CanvasRenderingContext2D} ctx
   */
  drawSpike(ctx) {
    const colors = this.theme.obstacles.colors;
    const glowColor = this.theme.obstacles.glowColor;
    const outlineColor = this.theme.obstacles.outlineColor;

    // Add glow effect
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;

    // Draw top spikes (pointing down)
    this.drawSpikeRow(ctx, 0, this.topHeight, colors, outlineColor, 'down');

    // Draw bottom spikes (pointing up)
    this.drawSpikeRow(ctx, this.bottomY, this.canvasHeight, colors, outlineColor, 'up');

    ctx.shadowBlur = 0;
  }

  /**
   * Draw a row of spikes
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startY
   * @param {number} endY
   * @param {Array} colors
   * @param {string} outlineColor
   * @param {string} direction - 'up' or 'down'
   */
  drawSpikeRow(ctx, startY, endY, colors, outlineColor, direction) {
    const spikeWidth = 30;
    const spikeHeight = 40;
    const numSpikes = Math.ceil((endY - startY) / spikeHeight);

    const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[2]);
    gradient.addColorStop(1, colors[4]);

    for (let i = 0; i < numSpikes; i++) {
      const y = startY + i * spikeHeight;
      const centerX = this.x + this.width / 2;

      ctx.fillStyle = gradient;
      ctx.beginPath();

      if (direction === 'down') {
        // Triangle pointing down
        ctx.moveTo(this.x, y);
        ctx.lineTo(this.x + this.width, y);
        ctx.lineTo(centerX, y + spikeHeight);
      } else {
        // Triangle pointing up
        ctx.moveTo(centerX, y);
        ctx.lineTo(this.x, y + spikeHeight);
        ctx.lineTo(this.x + this.width, y + spikeHeight);
      }

      ctx.closePath();
      ctx.fill();

      // Outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Draw coral obstacles (Ocean theme)
   * @param {CanvasRenderingContext2D} ctx
   */
  drawCoral(ctx) {
    const colors = this.theme.obstacles.colors;
    const secondaryColors = this.theme.obstacles.secondaryColors;
    const outlineColor = this.theme.obstacles.outlineColor;

    // Draw wavy coral stalks
    this.drawWavyCoral(ctx, 0, this.topHeight, colors, outlineColor);
    this.drawWavyCoral(ctx, this.bottomY, this.canvasHeight, secondaryColors, outlineColor);
  }

  /**
   * Draw wavy coral stalk
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startY
   * @param {number} endY
   * @param {Array} colors
   * @param {string} outlineColor
   */
  drawWavyCoral(ctx, startY, endY, colors, outlineColor) {
    const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.25, colors[1]);
    gradient.addColorStop(0.5, colors[2]);
    gradient.addColorStop(0.75, colors[3]);
    gradient.addColorStop(1, colors[4]);

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Create wavy path
    const segments = 20;
    const height = endY - startY;
    const waveAmplitude = 8;

    ctx.moveTo(this.x, startY);

    for (let i = 0; i <= segments; i++) {
      const y = startY + (height / segments) * i;
      const wave = Math.sin(i * 0.5) * waveAmplitude;
      ctx.lineTo(this.x + wave, y);
    }

    for (let i = segments; i >= 0; i--) {
      const y = startY + (height / segments) * i;
      const wave = Math.sin(i * 0.5) * waveAmplitude;
      ctx.lineTo(this.x + this.width + wave, y);
    }

    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add bulbous cap at the gap edge
    const capRadius = this.width / 2 + 8;
    const capY = startY === 0 ? endY : startY;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, capY, capRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.stroke();
  }

  /**
   * Draw asteroid obstacles (Space theme)
   * @param {CanvasRenderingContext2D} ctx
   */
  drawAsteroid(ctx) {
    const colors = this.theme.obstacles.colors;
    const secondaryColors = this.theme.obstacles.secondaryColors;
    const outlineColor = this.theme.obstacles.outlineColor;
    const glowColor = this.theme.obstacles.glowColor;

    // Add subtle glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // Draw top asteroid
    this.drawSingleAsteroid(ctx, this.x + this.width / 2, this.topHeight - 30, 35, colors, outlineColor);

    // Draw bottom asteroid
    this.drawSingleAsteroid(ctx, this.x + this.width / 2, this.bottomY + 30, 35, secondaryColors, outlineColor);

    ctx.shadowBlur = 0;
  }

  /**
   * Draw a single rotating asteroid
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @param {number} centerY
   * @param {number} size
   * @param {Array} colors
   * @param {string} outlineColor
   */
  drawSingleAsteroid(ctx, centerX, centerY, size, colors, outlineColor) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);

    // Create gradient
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, colors[2]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[0]);

    // Draw irregular rock shape
    ctx.fillStyle = gradient;
    ctx.beginPath();

    const points = 8;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = size + Math.sin(i * 2.5) * 8;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add crater details
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-size * 0.2, size * 0.3, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw vertical columns extending from asteroids
    const columnWidth = this.width;
    const gradient2 = ctx.createLinearGradient(this.x, 0, this.x + columnWidth, 0);
    gradient2.addColorStop(0, colors[0]);
    gradient2.addColorStop(0.5, colors[2]);
    gradient2.addColorStop(1, colors[0]);

    ctx.fillStyle = gradient2;

    // Top column
    if (centerY < this.canvasHeight / 2) {
      ctx.fillRect(this.x, 0, columnWidth, centerY - size);
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, 0, columnWidth, centerY - size);
    } else {
      // Bottom column
      ctx.fillRect(this.x, centerY + size, columnWidth, this.canvasHeight - (centerY + size));
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, centerY + size, columnWidth, this.canvasHeight - (centerY + size));
    }
  }
}
