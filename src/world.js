/**
 * World class - handles background with parallax clouds
 */

export class World {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Multiple cloud layers for parallax effect
    this.cloudLayers = [
      this.generateClouds(5, 0.3, 0.6, 50, 70),   // Back layer - big, slow, faint
      this.generateClouds(6, 0.5, 0.75, 35, 50),  // Middle layer
      this.generateClouds(8, 0.8, 0.9, 20, 35),   // Front layer - small, fast, bright
    ];
  }

  /**
   * Generate a layer of background clouds
   */
  generateClouds(count, speedMultiplier, opacity, minSize, maxSize) {
    const clouds = [];
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * this.canvasWidth * 1.5,
        y: Math.random() * (this.canvasHeight * 0.6),
        size: minSize + Math.random() * (maxSize - minSize),
        speed: (0.3 + Math.random() * 0.4) * speedMultiplier,
        opacity: opacity,
        // Slight vertical drift
        yOffset: Math.random() * Math.PI * 2,
        yDrift: 0.2 + Math.random() * 0.3
      });
    }
    return clouds;
  }

  /**
   * Update world (animate clouds with parallax)
   */
  update() {
    this.cloudLayers.forEach(layer => {
      layer.forEach(cloud => {
        // Horizontal movement
        cloud.x -= cloud.speed;

        // Gentle vertical drift
        cloud.yOffset += 0.01;

        // Wrap around when off screen
        if (cloud.x + cloud.size * 2.5 < 0) {
          cloud.x = this.canvasWidth + cloud.size;
          cloud.y = Math.random() * (this.canvasHeight * 0.6);
        }
      });
    });
  }

  /**
   * Draw the world
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0E0F0');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw cloud layers (back to front)
    this.cloudLayers.forEach(layer => {
      this.drawCloudLayer(ctx, layer);
    });
  }

  /**
   * Draw a layer of clouds
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   */
  drawCloudLayer(ctx, clouds) {
    clouds.forEach(cloud => {
      const yDrift = Math.sin(cloud.yOffset) * cloud.yDrift * 3;
      const y = cloud.y + yDrift;

      ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
      ctx.beginPath();

      // Main cloud body
      ctx.arc(cloud.x, y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.6, y - cloud.size * 0.25, cloud.size * 0.75, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 1.1, y + cloud.size * 0.1, cloud.size * 0.85, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.4, y + cloud.size * 0.15, cloud.size * 0.6, 0, Math.PI * 2);

      ctx.fill();
    });
  }

  /**
   * Resize world when canvas changes
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
