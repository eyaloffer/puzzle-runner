/**
 * Obstacle class - Theme-based obstacles (pipes, spikes, coral, asteroids)
 */

import { gradientCache } from './utils/gradientCache.js';

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

    // CACHED: Create horizontal gradient for 3D pipe effect
    const pipeColorStops = [
      { offset: 0, color: colors[0] },
      { offset: 0.2, color: colors[1] },
      { offset: 0.5, color: colors[2] },
      { offset: 0.8, color: colors[3] },
      { offset: 1, color: colors[4] }
    ];
    const pipeGradient = gradientCache.getLinear(
      ctx,
      `pipe-body-${this.theme?.id || 'default'}`,
      this.x, 0, this.x + this.width, 0,
      pipeColorStops
    );

    // CACHED: Create gradient for caps (slightly darker/more contrast)
    const capColorStops = [
      { offset: 0, color: capColors[0] },
      { offset: 0.15, color: capColors[1] },
      { offset: 0.5, color: capColors[2] },
      { offset: 0.85, color: capColors[3] },
      { offset: 1, color: capColors[4] }
    ];
    const capGradient = gradientCache.getLinear(
      ctx,
      `pipe-cap-${this.theme?.id || 'default'}`,
      this.x - capOverhang, 0, this.x + this.width + capOverhang, 0,
      capColorStops
    );
    
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

    // REMOVED: shadowBlur (expensive on mobile)
    // Glow effect is now handled by darker gradient instead

    // Draw top spikes (pointing down)
    this.drawSpikeRow(ctx, 0, this.topHeight, colors, outlineColor, 'down');

    // Draw bottom spikes (pointing up)
    this.drawSpikeRow(ctx, this.bottomY, this.canvasHeight, colors, outlineColor, 'up');
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

    // CACHED: Spike gradient
    const colorStops = [
      { offset: 0, color: colors[0] },
      { offset: 0.5, color: colors[2] },
      { offset: 1, color: colors[4] }
    ];
    const gradient = gradientCache.getLinear(
      ctx,
      `spike-${this.theme?.id || 'default'}`,
      this.x, 0, this.x + this.width, 0,
      colorStops
    );

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
    // CACHED: Coral gradient
    const colorStops = [
      { offset: 0, color: colors[0] },
      { offset: 0.25, color: colors[1] },
      { offset: 0.5, color: colors[2] },
      { offset: 0.75, color: colors[3] },
      { offset: 1, color: colors[4] }
    ];
    const gradient = gradientCache.getLinear(
      ctx,
      `coral-${startY === 0 ? 'top' : 'bottom'}-${this.theme?.id || 'default'}`,
      this.x, 0, this.x + this.width, 0,
      colorStops
    );

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

    // Draw top asteroid column and rock
    this.drawAsteroidColumn(ctx, 0, this.topHeight, colors, outlineColor, 'top');

    // Draw bottom asteroid column and rock
    this.drawAsteroidColumn(ctx, this.bottomY, this.canvasHeight, secondaryColors, outlineColor, 'bottom');
  }

  /**
   * Draw asteroid column with simple rock shape
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startY
   * @param {number} endY
   * @param {Array} colors
   * @param {string} outlineColor
   * @param {string} position - 'top' or 'bottom'
   */
  drawAsteroidColumn(ctx, startY, endY, colors, outlineColor, position) {
    const columnWidth = this.width;
    const asteroidSize = 35;
    const asteroidX = this.x + columnWidth / 2;
    const asteroidY = position === 'top' ? this.topHeight - 30 : this.bottomY + 30;

    // CACHED: Create linear gradient for column (simpler than radial)
    const columnColorStops = [
      { offset: 0, color: colors[0] },
      { offset: 0.5, color: colors[2] },
      { offset: 1, color: colors[0] }
    ];
    const columnGradient = gradientCache.getLinear(
      ctx,
      `asteroid-column-${position}-${this.theme?.id || 'default'}`,
      this.x, 0, this.x + columnWidth, 0,
      columnColorStops
    );

    ctx.fillStyle = columnGradient;

    // Draw column
    if (position === 'top') {
      const columnHeight = asteroidY - asteroidSize - startY;
      if (columnHeight > 0) {
        ctx.fillRect(this.x, startY, columnWidth, columnHeight);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, startY, columnWidth, columnHeight);
      }
    } else {
      const columnHeight = endY - (asteroidY + asteroidSize);
      if (columnHeight > 0) {
        ctx.fillRect(this.x, asteroidY + asteroidSize, columnWidth, columnHeight);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, asteroidY + asteroidSize, columnWidth, columnHeight);
      }
    }

    // Draw simple asteroid rock as rounded rectangle rotated
    ctx.save();
    ctx.translate(asteroidX, asteroidY);
    ctx.rotate(this.rotation);

    // CACHED: Use simple box shape instead of complex polygon
    const asteroidColorStops = [
      { offset: 0, color: colors[0] },
      { offset: 0.5, color: colors[2] },
      { offset: 1, color: colors[1] }
    ];
    const gradient = gradientCache.getLinear(
      ctx,
      `asteroid-rock-${position}-${this.theme?.id || 'default'}`,
      -asteroidSize / 2, -asteroidSize / 2, asteroidSize / 2, asteroidSize / 2,
      asteroidColorStops
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(-asteroidSize / 2, -asteroidSize / 2, asteroidSize, asteroidSize);

    // Outline only
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-asteroidSize / 2, -asteroidSize / 2, asteroidSize, asteroidSize);

    ctx.restore();
  }
}
