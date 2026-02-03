/**
 * Particle system for death/game over effects
 */

// Color palette derived from player trail colors
const PARTICLE_COLORS = [
  '#5B9BD5', // blue
  '#7EC8E3', // light blue
  '#FFD93D', // yellow
  '#FF6B6B', // red
  '#FFA94D', // orange
  '#FFFFFF', // white
];

/**
 * Single particle for explosion/scatter effects
 */
class DeathParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = 4 + Math.random() * 8;

    // Random velocity in all directions
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2; // slight upward bias

    this.gravity = 0.3;
    this.friction = 0.98;
    this.alpha = 1;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    this.life = 1;
    this.decay = 0.015 + Math.random() * 0.01;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    this.rotation += this.rotationSpeed;
    this.life -= this.decay;
    this.alpha = this.life;
  }

  draw(ctx) {
    if (this.life <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw as small square (broken piece effect)
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

    // Slight highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size / 2, this.size / 2);

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

/**
 * Splash particle that sticks to surfaces (pipes) - permanent, clipped to pipe
 * Looks like oozing paint splatter
 */
class SplashParticle {
  constructor(x, y, color, clipBounds) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = 5 + Math.random() * 10;
    this.alpha = 0.85;

    // Store clip bounds (the pipe rectangle this splash belongs to)
    this.clipBounds = clipBounds;

    // Generate random blob shape (offsets for organic look)
    this.blobPoints = [];
    const numPoints = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.6 + Math.random() * 0.8; // 60% to 140% of size
      this.blobPoints.push({
        angle,
        radius: this.size * radiusVariation
      });
    }

    // Multiple drips for oozing effect
    this.drips = [];
    const numDrips = Math.random() > 0.3 ? 1 + Math.floor(Math.random() * 3) : 0;
    for (let i = 0; i < numDrips; i++) {
      this.drips.push({
        offsetX: (Math.random() - 0.5) * this.size * 1.2,
        width: 2 + Math.random() * 4,
        speed: 0.2 + Math.random() * 0.6,
        maxLength: 15 + Math.random() * 35,
        currentLength: 0,
        wobble: Math.random() * Math.PI * 2 // for slight curve
      });
    }

    // Small satellite blobs
    this.satellites = [];
    const numSatellites = Math.floor(Math.random() * 3);
    for (let i = 0; i < numSatellites; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.size * (1.2 + Math.random() * 0.8);
      this.satellites.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 2 + Math.random() * 4
      });
    }
  }

  update() {
    // Grow drips over time
    for (const drip of this.drips) {
      if (drip.currentLength < drip.maxLength) {
        drip.currentLength += drip.speed;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Clip to pipe bounds so splash doesn't float in air
    if (this.clipBounds) {
      ctx.beginPath();
      ctx.rect(
        this.clipBounds.x,
        this.clipBounds.y,
        this.clipBounds.width,
        this.clipBounds.height
      );
      ctx.clip();
    }

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    // Draw main blob with organic shape
    ctx.beginPath();
    const firstPoint = this.blobPoints[0];
    ctx.moveTo(
      this.x + Math.cos(firstPoint.angle) * firstPoint.radius,
      this.y + Math.sin(firstPoint.angle) * firstPoint.radius
    );

    for (let i = 1; i <= this.blobPoints.length; i++) {
      const curr = this.blobPoints[i % this.blobPoints.length];
      const prev = this.blobPoints[i - 1];

      // Use quadratic curves for smooth blob edges
      const cpX = this.x + Math.cos((prev.angle + curr.angle) / 2) * ((prev.radius + curr.radius) / 2) * 1.1;
      const cpY = this.y + Math.sin((prev.angle + curr.angle) / 2) * ((prev.radius + curr.radius) / 2) * 1.1;
      const endX = this.x + Math.cos(curr.angle) * curr.radius;
      const endY = this.y + Math.sin(curr.angle) * curr.radius;

      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    }
    ctx.fill();

    // Draw satellite blobs
    for (const sat of this.satellites) {
      ctx.beginPath();
      ctx.arc(this.x + sat.x, this.y + sat.y, sat.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw oozing drips
    for (const drip of this.drips) {
      if (drip.currentLength > 0) {
        const startX = this.x + drip.offsetX;
        const startY = this.y;
        const endY = startY + drip.currentLength;
        const wobbleX = Math.sin(drip.wobble) * 3;

        ctx.beginPath();
        ctx.moveTo(startX - drip.width / 2, startY);

        // Curved drip shape that narrows toward the end
        ctx.quadraticCurveTo(
          startX - drip.width / 2 + wobbleX,
          startY + drip.currentLength * 0.6,
          startX,
          endY
        );
        ctx.quadraticCurveTo(
          startX + drip.width / 2 + wobbleX,
          startY + drip.currentLength * 0.6,
          startX + drip.width / 2,
          startY
        );
        ctx.fill();

        // Drip droplet at the end
        const dropletSize = drip.width * 0.6;
        ctx.beginPath();
        ctx.arc(startX, endY + dropletSize * 0.5, dropletSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  isDead() {
    return false; // Splash particles are permanent
  }
}

/**
 * Sparkle particle for collection effects - uses ✨ emoji
 */
class SparkleParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 14 + Math.random() * 12;

    // Burst outward from collection point
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1; // slight upward bias

    this.gravity = 0.08;
    this.friction = 0.96;
    this.alpha = 1;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.015;

    // Twinkle effect
    this.twinkleSpeed = 0.15 + Math.random() * 0.2;
    this.twinklePhase = Math.random() * Math.PI * 2;

    this.rotation = (Math.random() - 0.5) * 0.5;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    this.rotation += this.rotationSpeed;
    this.twinklePhase += this.twinkleSpeed;
    this.life -= this.decay;
    this.alpha = this.life;
  }

  draw(ctx) {
    if (this.life <= 0) return;

    // Twinkle effect - pulse size
    const twinkle = 0.8 + Math.sin(this.twinklePhase) * 0.2;
    const size = this.size * twinkle;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw outer glow
    const glowSize = size * 1.2;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${this.alpha * 0.8})`);
    gradient.addColorStop(0.4, `rgba(255, 236, 139, ${this.alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 255, 200, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw ✨ emoji (removed shadowBlur for mobile performance)
    ctx.globalAlpha = this.alpha;
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', 0, 0);

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

/**
 * Particle system manager
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.splashParticles = [];
    this.sparkleParticles = [];
    this.screenShake = { active: false, intensity: 0, duration: 0, elapsed: 0 };
  }

  /**
   * Create explosion particles at player position (death effect)
   * @param {number} x - Player center X
   * @param {number} y - Player center Y
   * @param {string[]} colors - Colors to use for particles
   */
  createDeathExplosion(x, y, colors = PARTICLE_COLORS) {
    const particleCount = 30 + Math.floor(Math.random() * 15);

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new DeathParticle(x, y, color));
    }
  }

  /**
   * Create splash particles on obstacles near the collision
   * @param {Object[]} obstacles - Array of obstacles
   * @param {number} playerX - Player X position (center)
   * @param {number} playerY - Player Y position (center)
   * @param {string[]} colors - Colors to use
   */
  createPipeSplash(obstacles, playerX, playerY, colors = PARTICLE_COLORS) {
    // Find obstacles near the player
    for (const obstacle of obstacles) {
      const distX = Math.abs(obstacle.x + obstacle.width / 2 - playerX);

      // Only splash on nearby pipes
      if (distX < 100) {
        const splashCount = 10 + Math.floor(Math.random() * 6);
        const capOverhang = 5; // Match the pipe cap overhang from obstacle.js

        // Determine which pipe was hit based on player Y position
        const hitTopPipe = playerY < obstacle.gapY;

        for (let i = 0; i < splashCount; i++) {
          let splashX, splashY, clipBounds;

          // Spawn splash around the actual crash location
          // Spread horizontally across the pipe face
          splashX = obstacle.x - capOverhang + Math.random() * (obstacle.width + capOverhang * 2);

          // Spread vertically around player's Y position with some randomness
          const ySpread = 40;
          splashY = playerY + (Math.random() - 0.5) * ySpread;

          if (hitTopPipe) {
            // Clip bounds for top pipe (from top of screen to bottom of top pipe)
            clipBounds = {
              x: obstacle.x - capOverhang,
              y: 0,
              width: obstacle.width + capOverhang * 2,
              height: obstacle.topHeight
            };
          } else {
            // Clip bounds for bottom pipe (from top of bottom pipe to bottom of screen)
            clipBounds = {
              x: obstacle.x - capOverhang,
              y: obstacle.bottomY,
              width: obstacle.width + capOverhang * 2,
              height: obstacle.canvasHeight - obstacle.bottomY
            };
          }

          const color = colors[Math.floor(Math.random() * colors.length)];
          this.splashParticles.push(new SplashParticle(splashX, splashY, color, clipBounds));
        }
      }
    }
  }

  /**
   * Create sparkle particles for letter collection
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   */
  createCollectSparkles(x, y) {
    const particleCount = 12 + Math.floor(Math.random() * 8);

    for (let i = 0; i < particleCount; i++) {
      this.sparkleParticles.push(new SparkleParticle(x, y));
    }
  }

  /**
   * Start screen shake effect
   * @param {number} intensity - Shake intensity in pixels
   * @param {number} duration - Duration in milliseconds
   */
  startScreenShake(intensity = 15, duration = 400) {
    this.screenShake = {
      active: true,
      intensity,
      duration,
      elapsed: 0,
      lastTime: performance.now()
    };
  }

  /**
   * Get current screen shake offset
   * @returns {{x: number, y: number}}
   */
  getShakeOffset() {
    if (!this.screenShake.active) {
      return { x: 0, y: 0 };
    }

    const now = performance.now();
    const delta = now - this.screenShake.lastTime;
    this.screenShake.lastTime = now;
    this.screenShake.elapsed += delta;

    if (this.screenShake.elapsed >= this.screenShake.duration) {
      this.screenShake.active = false;
      return { x: 0, y: 0 };
    }

    // Decay intensity over time
    const progress = this.screenShake.elapsed / this.screenShake.duration;
    const currentIntensity = this.screenShake.intensity * (1 - progress);

    // Random shake offset
    return {
      x: (Math.random() - 0.5) * 2 * currentIntensity,
      y: (Math.random() - 0.5) * 2 * currentIntensity
    };
  }

  /**
   * Update all particles
   */
  update() {
    // Update death particles
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => !p.isDead());

    // Update splash particles (permanent, don't filter)
    this.splashParticles.forEach(p => p.update());

    // Update sparkle particles
    this.sparkleParticles.forEach(p => p.update());
    this.sparkleParticles = this.sparkleParticles.filter(p => !p.isDead());
  }

  /**
   * Draw all particles
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Draw splash particles first (behind other elements)
    this.splashParticles.forEach(p => p.draw(ctx));

    // Draw death particles
    this.particles.forEach(p => p.draw(ctx));

    // Draw sparkle particles (on top)
    this.sparkleParticles.forEach(p => p.draw(ctx));
  }

  /**
   * Check if there are active temporary particles or effects
   * (excludes permanent splash particles)
   * @returns {boolean}
   */
  isActive() {
    return this.particles.length > 0 || this.sparkleParticles.length > 0 || this.screenShake.active;
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
    this.splashParticles = [];
    this.sparkleParticles = [];
    this.screenShake.active = false;
  }
}
