/**
 * World class - handles background with theme-based parallax clouds/effects
 */

export class World {
  constructor(canvasWidth, canvasHeight, theme = null) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.theme = theme;
    console.log('World created with theme:', theme?.id);

    // Multiple cloud layers for parallax effect
    this.cloudLayers = [
      this.generateClouds(5, 0.3, 0.6, 50, 70),   // Back layer - big, slow, faint
      this.generateClouds(6, 0.5, 0.75, 35, 50),  // Middle layer
      this.generateClouds(8, 0.8, 0.9, 20, 35),   // Front layer - small, fast, bright
    ];

    // Generate stars for space theme
    this.stars = [];
    if (theme?.sky?.stars) {
      this.generateStars(150);
    }
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
   * Generate stars for space theme
   */
  generateStars(count) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Update world (animate clouds/effects with parallax)
   */
  update() {
    const cloudType = this.theme?.clouds?.type || 'fluffy';

    this.cloudLayers.forEach(layer => {
      layer.forEach(cloud => {
        // Horizontal movement (bubbles rise instead for ocean theme)
        if (cloudType === 'bubbles') {
          cloud.y -= cloud.speed * 0.5; // Rise upward
          cloud.x -= cloud.speed * 0.3; // Slight drift
        } else {
          cloud.x -= cloud.speed;
        }

        // Gentle vertical drift (except bubbles which rise)
        if (cloudType !== 'bubbles') {
          cloud.yOffset += 0.01;
        }

        // Wrap around when off screen
        if (cloudType === 'bubbles') {
          if (cloud.y + cloud.size < 0) {
            cloud.y = this.canvasHeight + cloud.size;
            cloud.x = Math.random() * this.canvasWidth;
          }
        } else {
          if (cloud.x + cloud.size * 2.5 < 0) {
            cloud.x = this.canvasWidth + cloud.size;
            cloud.y = Math.random() * (this.canvasHeight * 0.6);
          }
        }
      });
    });

    // Update star twinkling
    if (this.stars.length > 0) {
      this.stars.forEach(star => {
        star.twinkleOffset += star.twinkleSpeed;
      });
    }
  }

  /**
   * Draw the world
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Sky gradient (use theme colors)
    const skyColors = this.theme?.sky?.gradient || ['#87CEEB', '#B0E0F0', '#E0F6FF'];
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);

    if (skyColors.length === 3) {
      gradient.addColorStop(0, skyColors[0]);
      gradient.addColorStop(0.5, skyColors[1]);
      gradient.addColorStop(1, skyColors[2]);
    } else {
      // Fallback for different gradient lengths
      skyColors.forEach((color, index) => {
        gradient.addColorStop(index / (skyColors.length - 1), color);
      });
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw stars for space theme
    if (this.stars.length > 0) {
      this.drawStars(ctx);
    }

    // Draw cloud layers (back to front)
    const cloudType = this.theme?.clouds?.type || 'fluffy';
    this.cloudLayers.forEach(layer => {
      this.drawCloudLayer(ctx, layer, cloudType);
    });
  }

  /**
   * Draw stars (space theme)
   * @param {CanvasRenderingContext2D} ctx
   */
  drawStars(ctx) {
    this.stars.forEach(star => {
      const twinkle = (Math.sin(star.twinkleOffset) + 1) / 2; // 0 to 1
      const opacity = star.opacity * (0.5 + twinkle * 0.5);

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Draw a layer of clouds (theme-based)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   * @param {string} cloudType
   */
  drawCloudLayer(ctx, clouds, cloudType) {
    switch (cloudType) {
      case 'fire':
        this.drawFireClouds(ctx, clouds);
        break;
      case 'bubbles':
        this.drawBubbles(ctx, clouds);
        break;
      case 'nebula':
        this.drawNebulaClouds(ctx, clouds);
        break;
      case 'fluffy':
      default:
        this.drawFluffyClouds(ctx, clouds);
        break;
    }
  }

  /**
   * Draw fluffy clouds (classic theme)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   */
  drawFluffyClouds(ctx, clouds) {
    const defaultColor = 'rgba(255, 255, 255, 0.9)';
    const cloudColor = (this.theme?.clouds?.color && typeof this.theme.clouds.color === 'string')
      ? this.theme.clouds.color
      : defaultColor;

    clouds.forEach(cloud => {
      const yDrift = Math.sin(cloud.yOffset) * cloud.yDrift * 3;
      const y = cloud.y + yDrift;

      const safeColor = cloudColor || defaultColor;
      ctx.fillStyle = safeColor.replace(/[\d.]+\)/, `${cloud.opacity})`);
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
   * Draw fire clouds (evil theme)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   */
  drawFireClouds(ctx, clouds) {
    const defaultPrimaryColor = 'rgba(255, 69, 0, 0.7)';
    const defaultSecondaryColor = 'rgba(255, 140, 0, 0.5)';
    const primaryColor = (this.theme?.clouds?.color && typeof this.theme.clouds.color === 'string')
      ? this.theme.clouds.color
      : defaultPrimaryColor;
    const secondaryColor = (this.theme?.clouds?.secondaryColor && typeof this.theme.clouds.secondaryColor === 'string')
      ? this.theme.clouds.secondaryColor
      : defaultSecondaryColor;

    // Use time-based flicker for better performance (avoid Math.random every frame)
    const time = Date.now() * 0.003;

    clouds.forEach((cloud, index) => {
      const yDrift = Math.sin(cloud.yOffset) * cloud.yDrift * 5;
      const y = cloud.y + yDrift;

      // Time-based flickering (cheaper than random + unique per cloud)
      const flicker = 0.8 + Math.sin(time + index * 0.5) * 0.2 + 0.2;
      const opacity = cloud.opacity * flicker;

      // Use globalAlpha instead of creating new color strings
      ctx.globalAlpha = opacity;

      // Simplified rendering without gradient (much faster)
      // Draw secondary color (outer glow)
      const safePrimary = primaryColor || defaultPrimaryColor;
      const safeSecondary = secondaryColor || defaultSecondaryColor;
      ctx.fillStyle = safeSecondary;
      ctx.beginPath();
      ctx.arc(cloud.x, y, cloud.size * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw primary color (inner flame)
      ctx.globalAlpha = opacity * 0.8;
      ctx.fillStyle = safePrimary;
      ctx.beginPath();
      ctx.arc(cloud.x, y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.5, y - cloud.size * 0.4, cloud.size * 0.6, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.3, y + cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1.0; // Reset
    });
  }

  /**
   * Draw bubbles (ocean theme)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   */
  drawBubbles(ctx, clouds) {
    const defaultOuterColor = 'rgba(173, 216, 230, 0.4)';
    const defaultInnerColor = 'rgba(255, 255, 255, 0.3)';
    const outerColor = (this.theme?.clouds?.color && typeof this.theme.clouds.color === 'string')
      ? this.theme.clouds.color
      : defaultOuterColor;
    const innerColor = (this.theme?.clouds?.innerColor && typeof this.theme.clouds.innerColor === 'string')
      ? this.theme.clouds.innerColor
      : defaultInnerColor;

    clouds.forEach(cloud => {
      const y = cloud.y;

      // Outer bubble
      const safeOuter = outerColor || defaultOuterColor;
      ctx.fillStyle = safeOuter.replace(/[\d.]+\)/, `${cloud.opacity})`);
      ctx.beginPath();
      ctx.arc(cloud.x, y, cloud.size, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      const safeInner = innerColor || defaultInnerColor;
      ctx.fillStyle = safeInner.replace(/[\d.]+\)/, `${cloud.opacity * 0.6})`);
      ctx.beginPath();
      ctx.arc(cloud.x - cloud.size * 0.3, y - cloud.size * 0.3, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Bubble outline
      ctx.strokeStyle = `rgba(255, 255, 255, ${cloud.opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cloud.x, y, cloud.size, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  /**
   * Draw nebula clouds (space theme)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} clouds
   */
  drawNebulaClouds(ctx, clouds) {
    // Ensure all colors have fallback values
    const defaultColors = [
      'rgba(255, 105, 180, 0.3)',
      'rgba(147, 112, 219, 0.3)',
      'rgba(138, 43, 226, 0.2)'
    ];

    // Safely get colors with type checking
    const getColor = (color, fallback) => {
      return (color && typeof color === 'string') ? color : fallback;
    };

    const colors = [
      getColor(this.theme?.clouds?.color, defaultColors[0]),
      getColor(this.theme?.clouds?.secondaryColor, defaultColors[1]),
      getColor(this.theme?.clouds?.tertiaryColor, defaultColors[2])
    ];

    clouds.forEach(cloud => {
      const yDrift = Math.sin(cloud.yOffset) * cloud.yDrift * 4;
      const y = cloud.y + yDrift;

      // Create glowing nebula effect with multiple colors
      const colorIndex = Math.floor(cloud.x / 100) % 3;
      const gradient = ctx.createRadialGradient(cloud.x, y, 0, cloud.x, y, cloud.size * 2);

      // Safely handle color replacement with guaranteed string values
      // Triple fallback: theme color -> colors array -> default array -> hard-coded default
      const color0 = colors[colorIndex] || defaultColors[colorIndex] || 'rgba(255, 105, 180, 0.3)';
      const color1 = colors[(colorIndex + 1) % 3] || defaultColors[(colorIndex + 1) % 3] || 'rgba(147, 112, 219, 0.3)';
      const color2 = colors[(colorIndex + 2) % 3] || defaultColors[(colorIndex + 2) % 3] || 'rgba(138, 43, 226, 0.2)';

      // Extra safety: ensure we have valid strings before calling replace
      const safeColor0 = (typeof color0 === 'string' && color0) ? color0 : 'rgba(255, 105, 180, 0.3)';
      const safeColor1 = (typeof color1 === 'string' && color1) ? color1 : 'rgba(147, 112, 219, 0.3)';
      const safeColor2 = (typeof color2 === 'string' && color2) ? color2 : 'rgba(138, 43, 226, 0.2)';

      gradient.addColorStop(0, safeColor0.replace(/[\d.]+\)/, `${cloud.opacity * 0.8})`));
      gradient.addColorStop(0.5, safeColor1.replace(/[\d.]+\)/, `${cloud.opacity * 0.5})`));
      gradient.addColorStop(1, safeColor2.replace(/[\d.]+\)/, '0)'));

      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Irregular nebula shape
      ctx.arc(cloud.x, y, cloud.size * 1.2, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.8, y - cloud.size * 0.3, cloud.size * 0.9, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.5, y + cloud.size * 0.4, cloud.size, 0, Math.PI * 2);

      ctx.fill();

      // Add glow effect
      ctx.shadowColor = safeColor0.replace(/[\d.]+\)/, '0.3)');
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
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
