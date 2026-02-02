# Birdle Development Tools

This directory contains development-only performance monitoring and testing tools. **None of these files affect production builds** - they are completely isolated from the main game.

## 🎯 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install Playwright (required for automated testing).

### 2. Run Dev Server

```bash
npm run dev
```

### 3. Open Dev Version

Navigate to: `http://localhost:5173/dev/game-dev.html`

Create a puzzle with different themes and press **P** to toggle the performance overlay.

## 📊 Performance Monitor

The performance monitor shows real-time metrics overlaid on the game canvas.

### Features:
- **FPS** (color-coded: green=good, yellow=moderate, red=bad)
- **Frame timing** breakdown (update vs draw time)
- **Rendering operations** count:
  - Draw calls
  - Gradient creations (performance killer!)
  - Shadow blur usage (GPU-intensive!)
- **Live FPS graph**

### Usage:
1. Open `dev/game-dev.html` in your browser
2. Start a game with any theme
3. Press **P** to toggle the performance overlay
4. Press **P** again to hide it

## 🧪 Automated Performance Testing

Test performance across all themes and measure the impact of code changes.

### Install Playwright (first time only):

```bash
npm install
```

### Testing Workflow:

#### 1. Create Baseline (before optimizations)

```bash
npm run perf:baseline
```

This runs the game with each theme for 10 seconds and saves the baseline metrics to `dev/.results/baseline.json`.

#### 2. Make Code Changes

Edit your code to optimize performance (e.g., cache gradients, remove shadow blur).

#### 3. Compare Performance

```bash
npm run perf:compare
```

This runs the same tests and generates a comparison report showing:
- FPS improvements/regressions
- Draw time changes
- Gradient/shadow blur count differences

#### 4. View Results

The comparison report is saved to `dev/.results/report.md` and printed to the console.

### Additional Test Commands:

```bash
# Quick 5-second test (faster feedback during development)
npm run perf:quick

# Test specific theme only
npm run perf:test -- --theme ocean

# Test without saving results
npm run perf:test
```

## 📁 File Structure

```
dev/
├── game-dev.html          # Dev version of game.html with perf overlay
├── benchmark.html         # Automated testing page (auto-starts)
├── perf-overlay.js        # Injects performance monitor into game
├── performance-test.js    # Automated test runner script
├── README.md              # This file
└── .results/              # Test results (gitignored)
    ├── baseline.json      # Baseline performance data
    ├── latest.json        # Most recent test results
    └── report.md          # Comparison report
```

## 🎨 How It Works

### Performance Overlay Injection

The `perf-overlay.js` script uses monkey-patching to inject performance monitoring without modifying any production code:

1. **Intercepts `canvas.getContext()`** - Wraps the game canvas when created
2. **Intercepts `requestAnimationFrame()`** - Tracks frame timing automatically
3. **Tracks rendering operations** - Counts gradients, shadow blurs, draw calls
4. **Draws overlay** - Uses `setInterval()` to periodically draw metrics

### Automated Testing

The `performance-test.js` script uses Playwright to:

1. Launch headless Chrome
2. Navigate to `benchmark.html` with test phrase and theme
3. Wait for game to auto-start
4. Let game run for 10 seconds
5. Extract metrics from `window.__DEV_PERF_MONITOR__`
6. Save and compare results

## 📈 Interpreting Results

### Good Performance:
- **FPS**: 60 (smooth gameplay)
- **Draw time**: < 5ms
- **Gradients**: 0-5 per frame
- **Shadow blurs**: 0-2 per frame

### Bad Performance (needs optimization):
- **FPS**: < 30 (laggy, stuttering)
- **Draw time**: > 15ms
- **Gradients**: 20+ per frame ❌
- **Shadow blurs**: 10+ per frame ❌

### Common Bottlenecks:

1. **Creating gradients every frame**
   - Solution: Cache gradients in constructors
   - Impact: Can reduce 20-50 gradients to 0-2

2. **Shadow blur abuse**
   - Solution: Use gradient-based glows instead
   - Impact: Can reduce 10-20 shadow blurs to 0-1

3. **Complex path drawing**
   - Solution: Reduce segments, simplify shapes
   - Impact: Moderate improvement

## 🚀 Optimization Tips

### Phase 1: Cache Gradients (CRITICAL)

**Before:**
```javascript
draw(ctx) {
  const gradient = ctx.createLinearGradient(x, y, x2, y2);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
```

**After:**
```javascript
constructor() {
  // Cache gradient once
  this.cachedGradient = null;
}

draw(ctx) {
  if (!this.cachedGradient) {
    this.cachedGradient = ctx.createLinearGradient(x, y, x2, y2);
    this.cachedGradient.addColorStop(0, color1);
    this.cachedGradient.addColorStop(1, color2);
  }
  ctx.fillStyle = this.cachedGradient;
  ctx.fill();
}
```

### Phase 2: Replace Shadow Blur

**Before:**
```javascript
draw(ctx) {
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#FF0000';
  ctx.fill();
  ctx.shadowBlur = 0;
}
```

**After:**
```javascript
draw(ctx) {
  // Draw with gradient glow instead
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();
}
```

## 🔧 Troubleshooting

### "Dev server not running on port 5173"
**Solution:** Run `npm run dev` before testing

### "Performance monitor not found"
**Solution:** Make sure you're using `dev/game-dev.html`, not `game.html`

### "No baseline found"
**Solution:** Run `npm run perf:baseline` first before comparing

### Playwright installation fails
**Solution:** Try `npx playwright install` to manually install browsers

## 📝 Notes

- All dev tools are **completely isolated** from production code
- `game.js` and `game.html` are **never modified**
- Production builds (`npm run build`) **never include** the `dev/` folder
- Test results in `.results/` are gitignored
- Playwright will download ~200MB of browser binaries on first install
- Each full test takes ~40 seconds (10s per theme × 4 themes)

## 🎯 Example Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Test themes manually (open browser to dev/game-dev.html)
# Press P to see current performance

# 3. Create baseline before optimizing
npm run perf:baseline

# 4. Make optimizations to world.js, obstacle.js, etc.

# 5. Compare performance
npm run perf:compare

# 6. View results
cat dev/.results/report.md

# 7. If performance improved, commit changes!
git add src/
git commit -m "Optimize theme rendering (cache gradients)"
```

## 📊 Real Example

Before optimization:
- Ocean theme: 28 FPS (laggy!)
- 45 gradients per frame
- 12 shadow blurs per frame

After optimization:
- Ocean theme: 60 FPS (smooth!)
- 2 gradients per frame (-95%)
- 0 shadow blurs per frame (-100%)

**Result:** 2.1x FPS improvement! 🎉

---

Happy optimizing! 🚀
