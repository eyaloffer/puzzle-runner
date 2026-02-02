/**
 * Performance Monitor - Track FPS, draw calls, and rendering performance
 * Press 'P' to toggle performance overlay during gameplay
 */

export class PerformanceMonitor {
  constructor() {
    this.enabled = false;
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsUpdateInterval = 500; // Update FPS every 500ms
    this.lastFpsUpdate = this.lastTime;

    // Performance metrics
    this.metrics = {
      drawTime: 0,
      updateTime: 0,
      totalFrameTime: 0,
      drawCalls: 0,
      gradientCreations: 0,
      shadowBlurUsage: 0
    };

    // Historical data for graphing
    this.history = {
      fps: [],
      drawTime: [],
      updateTime: [],
      maxHistory: 60 // Keep 60 samples
    };

    // Setup keyboard toggle
    this.setupToggle();
  }

  /**
   * Setup keyboard shortcut to toggle performance overlay
   */
  setupToggle() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' && !e.repeat) {
        this.enabled = !this.enabled;
        console.log('Performance monitor:', this.enabled ? 'enabled' : 'disabled');
      }
    });
  }

  /**
   * Start measuring frame time
   */
  startFrame() {
    this.frameStartTime = performance.now();
    this.metrics.drawCalls = 0;
    this.metrics.gradientCreations = 0;
    this.metrics.shadowBlurUsage = 0;
  }

  /**
   * Mark start of update phase
   */
  startUpdate() {
    this.updateStartTime = performance.now();
  }

  /**
   * Mark end of update phase
   */
  endUpdate() {
    this.metrics.updateTime = performance.now() - this.updateStartTime;
  }

  /**
   * Mark start of draw phase
   */
  startDraw() {
    this.drawStartTime = performance.now();
  }

  /**
   * Mark end of draw phase
   */
  endDraw() {
    this.metrics.drawTime = performance.now() - this.drawStartTime;
  }

  /**
   * End frame measurement and update FPS
   */
  endFrame() {
    const now = performance.now();
    this.metrics.totalFrameTime = now - this.frameStartTime;
    this.frameCount++;

    // Update FPS
    const deltaTime = now - this.lastFpsUpdate;
    if (deltaTime >= this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // Update history
      this.history.fps.push(this.fps);
      this.history.drawTime.push(this.metrics.drawTime);
      this.history.updateTime.push(this.metrics.updateTime);

      // Limit history size
      if (this.history.fps.length > this.history.maxHistory) {
        this.history.fps.shift();
        this.history.drawTime.shift();
        this.history.updateTime.shift();
      }
    }
  }

  /**
   * Increment draw call counter
   */
  recordDrawCall() {
    this.metrics.drawCalls++;
  }

  /**
   * Increment gradient creation counter
   */
  recordGradientCreation() {
    this.metrics.gradientCreations++;
  }

  /**
   * Increment shadow blur usage counter
   */
  recordShadowBlur() {
    this.metrics.shadowBlurUsage++;
  }

  /**
   * Draw performance overlay on canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  draw(ctx, canvasWidth, canvasHeight) {
    if (!this.enabled) return;

    ctx.save();

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(10, 10, 300, 240);

    // Border
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 300, 240);

    // Title
    ctx.fillStyle = '#00FF00';
    ctx.font = "bold 14px monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Performance (P to toggle)', 20, 20);

    // FPS (color-coded)
    let fpsColor = '#00FF00'; // Green for good FPS
    if (this.fps < 60) fpsColor = '#FFFF00'; // Yellow for moderate
    if (this.fps < 30) fpsColor = '#FF0000'; // Red for bad

    ctx.fillStyle = fpsColor;
    ctx.font = "bold 24px monospace";
    ctx.fillText(`FPS: ${this.fps}`, 20, 45);

    // Frame timing
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "12px monospace";
    let y = 75;
    const lineHeight = 18;

    ctx.fillText(`Frame Time: ${this.metrics.totalFrameTime.toFixed(2)}ms`, 20, y);
    y += lineHeight;
    ctx.fillText(`  Update: ${this.metrics.updateTime.toFixed(2)}ms`, 20, y);
    y += lineHeight;
    ctx.fillText(`  Draw: ${this.metrics.drawTime.toFixed(2)}ms`, 20, y);
    y += lineHeight;

    // Draw operations (potential bottlenecks)
    y += 10;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Rendering Operations:', 20, y);
    y += lineHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`  Draw Calls: ${this.metrics.drawCalls}`, 20, y);
    y += lineHeight;
    ctx.fillText(`  Gradients: ${this.metrics.gradientCreations}`, 20, y);
    y += lineHeight;
    ctx.fillText(`  Shadow Blurs: ${this.metrics.shadowBlurUsage}`, 20, y);

    // Draw mini FPS graph
    this.drawGraph(ctx, 20, 210, 280, 30, this.history.fps, 0, 60, fpsColor);

    ctx.restore();
  }

  /**
   * Draw a mini graph
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number[]} data
   * @param {number} min
   * @param {number} max
   * @param {string} color
   */
  drawGraph(ctx, x, y, width, height, data, min, max, color) {
    if (data.length < 2) return;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw target line (60 FPS)
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    const targetY = y + height - ((60 - min) / (max - min)) * height;
    ctx.beginPath();
    ctx.moveTo(x, targetY);
    ctx.lineTo(x + width, targetY);
    ctx.stroke();

    // Draw data
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = width / (data.length - 1);
    data.forEach((value, i) => {
      const graphX = x + i * step;
      const graphY = y + height - ((value - min) / (max - min)) * height;

      if (i === 0) {
        ctx.moveTo(graphX, graphY);
      } else {
        ctx.lineTo(graphX, graphY);
      }
    });

    ctx.stroke();
  }

  /**
   * Get performance summary for logging
   * @returns {object}
   */
  getSummary() {
    return {
      fps: this.fps,
      avgDrawTime: this.getAverage(this.history.drawTime),
      avgUpdateTime: this.getAverage(this.history.updateTime),
      drawCalls: this.metrics.drawCalls,
      gradients: this.metrics.gradientCreations,
      shadowBlurs: this.metrics.shadowBlurUsage
    };
  }

  /**
   * Get average of array
   * @param {number[]} arr
   * @returns {number}
   */
  getAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Export complete performance results for automation
   * @returns {object} Complete performance data
   */
  exportResults() {
    const avgFps = this.getAverage(this.history.fps);
    const avgDrawTime = this.getAverage(this.history.drawTime);
    const avgUpdateTime = this.getAverage(this.history.updateTime);
    const avgTotalTime = avgDrawTime + avgUpdateTime;

    return {
      timestamp: Date.now(),
      summary: {
        avgFps: Math.round(avgFps * 100) / 100,
        minFps: this.history.fps.length > 0 ? Math.min(...this.history.fps) : 0,
        maxFps: this.history.fps.length > 0 ? Math.max(...this.history.fps) : 0,
        avgDrawTime: Math.round(avgDrawTime * 100) / 100,
        avgUpdateTime: Math.round(avgUpdateTime * 100) / 100,
        avgTotalFrameTime: Math.round(avgTotalTime * 100) / 100
      },
      currentMetrics: {
        fps: this.fps,
        drawTime: this.metrics.drawTime,
        updateTime: this.metrics.updateTime,
        totalFrameTime: this.metrics.totalFrameTime,
        drawCalls: this.metrics.drawCalls,
        gradients: this.metrics.gradientCreations,
        shadowBlurs: this.metrics.shadowBlurUsage
      },
      history: {
        fps: [...this.history.fps],
        drawTime: [...this.history.drawTime],
        updateTime: [...this.history.updateTime]
      },
      sampleCount: this.history.fps.length
    };
  }
}

/**
 * Wrap canvas context to track rendering operations
 * @param {CanvasRenderingContext2D} ctx
 * @param {PerformanceMonitor} monitor
 * @returns {CanvasRenderingContext2D}
 */
export function wrapContextForMonitoring(ctx, monitor) {
  // Store original methods
  const originalCreateLinearGradient = ctx.createLinearGradient.bind(ctx);
  const originalCreateRadialGradient = ctx.createRadialGradient.bind(ctx);
  const originalFillRect = ctx.fillRect.bind(ctx);
  const originalFillText = ctx.fillText.bind(ctx);
  const originalFill = ctx.fill.bind(ctx);
  const originalStroke = ctx.stroke.bind(ctx);

  // Wrap gradient creation
  ctx.createLinearGradient = function(...args) {
    if (monitor.enabled) monitor.recordGradientCreation();
    return originalCreateLinearGradient(...args);
  };

  ctx.createRadialGradient = function(...args) {
    if (monitor.enabled) monitor.recordGradientCreation();
    return originalCreateRadialGradient(...args);
  };

  // Wrap draw calls
  ctx.fillRect = function(...args) {
    if (monitor.enabled) monitor.recordDrawCall();
    return originalFillRect(...args);
  };

  ctx.fillText = function(...args) {
    if (monitor.enabled) monitor.recordDrawCall();
    return originalFillText(...args);
  };

  ctx.fill = function(...args) {
    if (monitor.enabled) monitor.recordDrawCall();
    return originalFill(...args);
  };

  ctx.stroke = function(...args) {
    if (monitor.enabled) monitor.recordDrawCall();
    return originalStroke(...args);
  };

  // Track shadowBlur changes
  let shadowBlurValue = 0;
  Object.defineProperty(ctx, 'shadowBlur', {
    get: () => shadowBlurValue,
    set: (value) => {
      if (monitor.enabled && value > 0 && shadowBlurValue === 0) {
        monitor.recordShadowBlur();
      }
      shadowBlurValue = value;
    }
  });

  return ctx;
}
