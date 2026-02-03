/**
 * World class - handles background with theme-based parallax clouds/effects
 */

import { gradientCache } from './utils/gradientCache.js';

export class World {
  constructor(canvasWidth, canvasHeight, theme = null, isMobile = false, mobileStarCount = 50, mobileCloudReduction = 0.5) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.theme = theme;
    this.isMobile = isMobile;
    console.log('World created with theme:', theme?.id, isMobile ? '(mobile mode)' : '');

    // Multiple cloud layers for parallax effect (reduced on mobile)
    const cloudMultiplier = isMobile ? mobileCloudReduction : 1;
    this.cloudLayers = [
      this.generateClouds(Math.ceil(5 * cloudMultiplier), 0.3, 0.6, 50, 70),   // Back layer - big, slow, faint
      this.generateClouds(Math.ceil(6 * cloudMultiplier), 0.5, 0.75, 35, 50),  // Middle layer
      this.generateClouds(Math.ceil(8 * cloudMultiplier), 0.8, 0.9, 20, 35),   // Front layer - small, fast, bright
    ];

    // Generate stars for space theme with OFF-SCREEN CANVAS for performance
    this.stars = [];
    this.starCanvas = null;
    this.starCtx = null;
    if (theme?.sky?.stars) {
      const starCount = isMobile ? mobileStarCount : 150;
      console.log(`⭐ Generating ${starCount} stars${isMobile ? ' (mobile optimization)' : ''}`);
      this.generateStars(starCount);
      this.createStarCanvas(); // Pre-render stars to off-screen canvas
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
   * Create off-screen canvas for stars (major performance optimization)
   * Reduces 150 arc() calls per frame to 1 drawImage() call
   */
  createStarCanvas() {
    if (this.stars.length === 0) return;

    // Create off-screen canvas
    this.starCanvas = document.createElement('canvas');
    this.starCanvas.width = this.canvasWidth;
    this.starCanvas.height = this.canvasHeight;
    this.starCtx = this.starCanvas.getContext('2d');

    // Render all stars once to the off-screen canvas
    // This is the ONLY time we'll draw individual stars
    this.stars.forEach(star => {
      this.starCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      this.starCtx.beginPath();
      this.starCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.starCtx.fill();
    });

    console.log(`✨ Pre-rendered ${this.stars.length} stars to off-screen canvas`);
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
    // Sky gradient (use theme colors) - CACHED
    const skyColors = this.theme?.sky?.gradient || ['#87CEEB', '#B0E0F0', '#E0F6FF'];

    // Use gradient cache instead of creating new gradient every frame
    const colorStops = skyColors.length === 3
      ? [
          { offset: 0, color: skyColors[0] },
          { offset: 0.5, color: skyColors[1] },
          { offset: 1, color: skyColors[2] }
        ]
      : skyColors.map((color, index) => ({
          offset: index / (skyColors.length - 1),
          color: color
        }));

    const gradient = gradientCache.getLinear(
      ctx,
      `sky-${this.theme?.id || 'default'}`,
      0, 0, 0, this.canvasHeight,
      colorStops
    );

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
   * Draw stars (space theme) using off-screen canvas for performance
   * @param {CanvasRenderingContext2D} ctx
   */
  drawStars(ctx) {
    if (this.starCanvas) {
      // OPTIMIZED: Use single drawImage() call instead of 150 arc() calls
      // Apply subtle twinkling via global alpha
      const avgTwinkle = Math.sin(Date.now() * 0.001) * 0.1 + 0.9; // 0.8 to 1.0
      ctx.globalAlpha = avgTwinkle;
      ctx.drawImage(this.starCanvas, 0, 0);
      ctx.globalAlpha = 1.0; // Reset
    } else {
      // Fallback to individual star rendering (shouldn't happen)
      this.stars.forEach(star => {
        const twinkle = (Math.sin(star.twinkleOffset) + 1) / 2; // 0 to 1
        const opacity = star.opacity * (0.5 + twinkle * 0.5);

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }
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

    clouds.forEach((cloud, cloudIdx) => {
      const yDrift = Math.sin(cloud.yOffset) * cloud.yDrift * 4;
      const y = cloud.y + yDrift;

      // Create glowing nebula effect with multiple colors
      const colorIndex = Math.floor(cloud.x / 100) % 3;

      // Safely handle color replacement with guaranteed string values
      // Triple fallback: theme color -> colors array -> default array -> hard-coded default
      const color0 = colors[colorIndex] || defaultColors[colorIndex] || 'rgba(255, 105, 180, 0.3)';
      const color1 = colors[(colorIndex + 1) % 3] || defaultColors[(colorIndex + 1) % 3] || 'rgba(147, 112, 219, 0.3)';
      const color2 = colors[(colorIndex + 2) % 3] || defaultColors[(colorIndex + 2) % 3] || 'rgba(138, 43, 226, 0.2)';

      // Extra safety: ensure we have valid strings before calling replace
      const safeColor0 = (typeof color0 === 'string' && color0) ? color0 : 'rgba(255, 105, 180, 0.3)';
      const safeColor1 = (typeof color1 === 'string' && color1) ? color1 : 'rgba(147, 112, 219, 0.3)';
      const safeColor2 = (typeof color2 === 'string' && color2) ? color2 : 'rgba(138, 43, 226, 0.2)';

      // CACHED: Use gradient cache with cloud-specific ID
      const colorStops = [
        { offset: 0, color: safeColor0.replace(/[\d.]+\)/, `${cloud.opacity * 0.8})`) },
        { offset: 0.5, color: safeColor1.replace(/[\d.]+\)/, `${cloud.opacity * 0.5})`) },
        { offset: 1, color: safeColor2.replace(/[\d.]+\)/, '0)') }
      ];

      const gradient = gradientCache.getRadial(
        ctx,
        `nebula-${colorIndex}-${Math.floor(cloud.opacity * 10)}-${cloudIdx}`,
        cloud.x, y, 0,
        cloud.x, y, cloud.size * 2,
        colorStops
      );

      ctx.fillStyle = gradient;
      ctx.beginPath();

      // Irregular nebula shape
      ctx.arc(cloud.x, y, cloud.size * 1.2, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.8, y - cloud.size * 0.3, cloud.size * 0.9, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.5, y + cloud.size * 0.4, cloud.size, 0, Math.PI * 2);

      ctx.fill();

      // REMOVED: shadowBlur (expensive on mobile)
      // Glow effect is now handled by the outer gradient stop with alpha fade
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

    // Regenerate star canvas if stars exist
    if (this.stars.length > 0) {
      const starCount = this.isMobile ? 50 : 150;
      this.stars = [];
      this.generateStars(starCount);
      this.createStarCanvas();
    }

    // Clear gradient cache on resize
    gradientCache.clear();
  }
}
