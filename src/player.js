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
    this.flapStrength = typeof opts.flapStrength === 'number' ? opts.flapStrength : -10;
    this.emoji = opts.emoji || '🐦';
    this.theme = opts.theme || null;
    this.rotation = 0; // Visual rotation based on velocity
    this.collectEffect = 0; // Collection animation timer

    // Trail effect - smooth glowing particles (use theme colors)
    this.trail = [];
    this.maxTrailLength = 12;
    this.trailColor = this.theme?.trail?.color || '#5B9BD5';
    this.glowColor = this.theme?.trail?.glowColor || '#FFD93D';
  }

  /**
   * Convert hex color to RGB object
   * @param {string} hex - Hex color string (e.g., "#5B9BD5")
   * @returns {{r: number, g: number, b: number}}
   */
  hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
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
    const targetRotation = Math.min(Math.max(this.velocityY * 0.05, -0.5), 0.5);
    this.rotation += (targetRotation - this.rotation) * 0.15;

    // Decay collect effect
    if (this.collectEffect > 0) {
      this.collectEffect -= 0.1;
    }

    // Update trail - add particle every frame for smooth continuous trail
    this.trail.push({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      size: 6 + Math.abs(this.velocityY) * 0.3, // Slightly larger when moving fast
      alpha: 0.6
    });

    // Limit trail length
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Update trail particles
    this.trail.forEach((particle, index) => {
      if (particle.isBurst) {
        // Burst particles have velocity and fade out
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.15; // gravity
        particle.alpha -= 0.04;
        particle.size *= 0.96;
      } else {
        // Regular trail: progressive fade based on position
        particle.alpha = 0.4 * (index / this.trail.length);
      }
    });

    // Remove faded burst particles
    this.trail = this.trail.filter(p => !p.isBurst || p.alpha > 0);

    // Keep player within screen bounds
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
   * Trigger collection effect
   */
  triggerCollectEffect() {
    this.collectEffect = 1;
  }

  /**
   * Make player flap (jump upward)
   */
  flap() {
    // Snap tilt up immediately for a "kick" effect
    this.rotation = -0.4;
    this.velocityY = this.flapStrength;

    // Add burst particles on flap
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.8; // Downward spread
      const speed = 2 + Math.random() * 2;
      this.trail.push({
        x: this.x + this.width / 2,
        y: this.y + this.height / 2 + 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 3,
        alpha: 0.8,
        isBurst: true
      });
    }
  }

  /**
   * Reset player to initial position and state
   */
  reset() {
    this.y = this.initialY;
    this.velocityY = 0;
    this.rotation = 0;
    this.trail = [];
  }

  /**
   * Draw the trail effect - smooth glowing particles
   * @param {CanvasRenderingContext2D} ctx
   */
  drawTrail(ctx) {
    if (this.trail.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw connecting line for smooth trail
    const regularTrail = this.trail.filter(p => !p.isBurst);
    if (regularTrail.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(regularTrail[0].x, regularTrail[0].y);

      for (let i = 1; i < regularTrail.length; i++) {
        const p = regularTrail[i];
        ctx.lineTo(p.x, p.y);
      }

      // Gradient stroke (use theme color)
      const gradient = ctx.createLinearGradient(
        regularTrail[0].x, regularTrail[0].y,
        regularTrail[regularTrail.length - 1].x, regularTrail[regularTrail.length - 1].y
      );
      const trailRGB = this.hexToRgb(this.trailColor);
      gradient.addColorStop(0, `rgba(${trailRGB.r}, ${trailRGB.g}, ${trailRGB.b}, 0)`);
      gradient.addColorStop(0.5, `rgba(${trailRGB.r}, ${trailRGB.g}, ${trailRGB.b}, 0.3)`);
      gradient.addColorStop(1, `rgba(${trailRGB.r}, ${trailRGB.g}, ${trailRGB.b}, 0.5)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 8;
      ctx.stroke();

      // Inner brighter line
      ctx.strokeStyle = `rgba(${trailRGB.r}, ${trailRGB.g}, ${trailRGB.b}, 0.4)`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw burst particles as glowing dots (use theme color)
    const burstParticles = this.trail.filter(p => p.isBurst);
    const trailRGB = this.hexToRgb(this.trailColor);
    for (const particle of burstParticles) {
      ctx.globalAlpha = particle.alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.trailColor;

      ctx.fillStyle = `rgba(${trailRGB.r}, ${trailRGB.g}, ${trailRGB.b}, 0.8)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Bright center
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset state before restore (mobile browser fix)
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#000000';

    ctx.restore();
  }

  /**
   * Draw the player
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Reset all state before drawing (fix for mobile browsers)
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    // Draw trail first (behind player)
    this.drawTrail(ctx);

    // Reset again after trail (mobile browsers may not restore properly)
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    ctx.save();

    // Translate to player center for rotation
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    // Apply collect effect (scale up briefly)
    const scale = 1 + this.collectEffect * 0.3;
    ctx.scale(scale, scale);

    // Draw glow during collection
    if (this.collectEffect > 0) {
      ctx.shadowBlur = 20 * this.collectEffect;
      ctx.shadowColor = this.glowColor;
    }

    // Draw emoji character (explicit fillStyle needed for mobile)
    ctx.fillStyle = '#000000';
    ctx.font = `${this.width * 1.2}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
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
