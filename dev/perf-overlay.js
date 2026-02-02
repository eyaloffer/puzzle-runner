/**
 * Performance Overlay - Dev-only injection script
 *
 * This script is loaded BEFORE game.js and injects the performance monitor
 * into the game without modifying any production code.
 *
 * How it works:
 * 1. Monkey-patches canvas.getContext() to wrap the game canvas
 * 2. Intercepts requestAnimationFrame to track frame timing and draw overlay
 * 3. Performance overlay is drawn after each game frame completes
 * 4. Exposes global __DEV_PERF_MONITOR__ for automation
 */

import { PerformanceMonitor, wrapContextForMonitoring } from '../src/performanceMonitor.js';

console.log('🔧 Performance overlay loading...');

// Create global performance monitor
window.__DEV_PERF_MONITOR__ = new PerformanceMonitor();
window.__DEV_PERF_MONITOR__.enabled = true; // Always enabled in dev mode

console.log('✅ Performance monitor enabled. Press P to toggle overlay.');

// Track if we've wrapped the game canvas
let gameCanvasWrapped = false;

// Intercept canvas.getContext() calls to wrap the game canvas
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, ...args) {
  const ctx = originalGetContext.call(this, type, ...args);

  // Only wrap the game canvas (2d context)
  if (type === '2d' && this.id === 'gameCanvas' && !gameCanvasWrapped) {
    console.log('🎨 Wrapping game canvas context for monitoring...');
    wrapContextForMonitoring(ctx, window.__DEV_PERF_MONITOR__);
    gameCanvasWrapped = true;

    // Store canvas dimensions for overlay
    window.__DEV_PERF_MONITOR__._canvas = this;
    window.__DEV_PERF_MONITOR__._ctx = ctx;
  }

  return ctx;
};

// Intercept requestAnimationFrame to track frames and draw overlay
const originalRAF = window.requestAnimationFrame;
let frameInProgress = false;

window.requestAnimationFrame = function(callback) {
  return originalRAF.call(window, function(timestamp) {
    const monitor = window.__DEV_PERF_MONITOR__;

    // Start frame timing
    if (monitor && !frameInProgress) {
      monitor.startFrame();
      frameInProgress = true;
    }

    // Call the game's frame callback
    const result = callback(timestamp);

    // End frame timing and draw overlay AFTER game frame
    if (monitor && frameInProgress) {
      monitor.endFrame();
      frameInProgress = false;

      // Draw overlay on EVERY frame to prevent flickering
      // (The PerformanceMonitor internally throttles metric updates)
      if (monitor.enabled && monitor._canvas && monitor._ctx) {
        const canvasWidth = monitor._canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = monitor._canvas.height / (window.devicePixelRatio || 1);
        monitor.draw(monitor._ctx, canvasWidth, canvasHeight);
      }
    }

    return result;
  });
};

// Performance overlay is now drawn automatically after each frame via rAF interception above
console.log('✅ Performance overlay integrated into requestAnimationFrame');

console.log('🎮 Performance overlay ready!');
