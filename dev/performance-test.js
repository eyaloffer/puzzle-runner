/**
 * Automated Performance Testing Script
 *
 * Usage:
 *   node dev/performance-test.js --mode baseline    # Create baseline
 *   node dev/performance-test.js --mode compare     # Compare with baseline
 *   node dev/performance-test.js --mode test        # Quick test (no save)
 *
 * Options:
 *   --quick            Run 5-second tests (vs 10-second default)
 *   --theme <name>     Test specific theme only
 *   --port <number>    Dev server port (default: 5173)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_PORT = 5173;
const DEFAULT_DURATION = 10000; // 10 seconds
const QUICK_DURATION = 5000; // 5 seconds
const THEMES = ['classic', 'evil', 'ocean', 'space'];
const RESULTS_DIR = path.join(__dirname, '.results');
const BASELINE_FILE = path.join(RESULTS_DIR, 'baseline.json');
const LATEST_FILE = path.join(RESULTS_DIR, 'latest.json');
const REPORT_FILE = path.join(RESULTS_DIR, 'report.md');

// Test phrase - consistent across all tests
const TEST_PHRASE = 'QUICK BROWN FOX JUMPS';

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'test';
const quick = args.includes('--quick');
const themeFilter = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : null;
const port = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : DEFAULT_PORT;
const duration = quick ? QUICK_DURATION : DEFAULT_DURATION;

console.log('🎯 Birdle Performance Testing');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Mode: ${mode}`);
console.log(`Duration: ${duration / 1000}s per theme`);
console.log(`Server: http://localhost:${port}`);
console.log('');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  console.log('✅ Created .results directory');
}

/**
 * Run performance benchmark for a specific theme
 * @param {string} theme - Theme name
 * @param {number} duration - Test duration in ms
 * @returns {Promise<object>} Performance metrics
 */
async function runBenchmark(theme, duration) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Encode test phrase for URL
    const encodedPhrase = Buffer.from(TEST_PHRASE).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Navigate to benchmark page with theme and phrase
    const url = `http://localhost:${port}/dev/benchmark.html?p=${encodedPhrase}&t=${theme}&e=🐦`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for game to initialize
    await page.waitForSelector('#gameCanvas', { timeout: 5000 });

    // Wait for auto-start (benchmark.html auto-starts after 2s)
    await page.waitForTimeout(2500);

    // Ensure performance monitor is enabled
    await page.evaluate(() => {
      if (window.__DEV_PERF_MONITOR__) {
        window.__DEV_PERF_MONITOR__.enabled = true;
      }
    });

    // Let game run for test duration
    console.log(`  Running for ${duration / 1000}s...`);
    await page.waitForTimeout(duration);

    // Extract metrics
    const metrics = await page.evaluate(() => {
      if (!window.__DEV_PERF_MONITOR__) {
        throw new Error('Performance monitor not found');
      }
      return window.__DEV_PERF_MONITOR__.exportResults();
    });

    await browser.close();
    return metrics;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Run benchmarks for all themes
 * @returns {Promise<object>} Results keyed by theme
 */
async function runAllThemes() {
  const themesToTest = themeFilter ? [themeFilter] : THEMES;
  const results = {};

  for (const theme of themesToTest) {
    console.log(`\n🎨 Testing ${theme} theme...`);
    try {
      results[theme] = await runBenchmark(theme, duration);
      console.log(`  ✅ FPS: ${results[theme].summary.avgFps.toFixed(1)} (${results[theme].summary.minFps}-${results[theme].summary.maxFps})`);
      console.log(`  ✅ Draw: ${results[theme].summary.avgDrawTime.toFixed(2)}ms`);
      console.log(`  ✅ Gradients: ${results[theme].currentMetrics.gradients}`);
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      results[theme] = null;
    }
  }

  return results;
}

/**
 * Generate comparison report
 * @param {object} baseline - Baseline results
 * @param {object} current - Current results
 */
function generateReport(baseline, current) {
  const lines = [];

  lines.push('# Performance Comparison Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  // Summary table
  lines.push('| Theme | Baseline FPS | Current FPS | Change | Status |');
  lines.push('|-------|--------------|-------------|--------|--------|');

  for (const theme of THEMES) {
    if (!baseline[theme] || !current[theme]) continue;

    const baselineFps = baseline[theme].summary.avgFps;
    const currentFps = current[theme].summary.avgFps;
    const change = currentFps - baselineFps;
    const changePercent = ((change / baselineFps) * 100).toFixed(1);
    const status = change > 5 ? '✅ Improved' : change < -5 ? '⚠️ Regressed' : '➖ Similar';

    lines.push(`| ${theme} | ${baselineFps.toFixed(1)} | ${currentFps.toFixed(1)} | ${change > 0 ? '+' : ''}${change.toFixed(1)} (${changePercent}%) | ${status} |`);
  }

  lines.push('');
  lines.push('## Detailed Metrics');
  lines.push('');

  for (const theme of THEMES) {
    if (!baseline[theme] || !current[theme]) continue;

    lines.push(`### ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`);
    lines.push('');

    // FPS
    const baselineFps = baseline[theme].summary;
    const currentFps = current[theme].summary;
    lines.push(`**FPS:**`);
    lines.push(`- Baseline: ${baselineFps.avgFps.toFixed(1)} (${baselineFps.minFps}-${baselineFps.maxFps})`);
    lines.push(`- Current: ${currentFps.avgFps.toFixed(1)} (${currentFps.minFps}-${currentFps.maxFps})`);
    lines.push(`- Change: ${(currentFps.avgFps - baselineFps.avgFps).toFixed(1)} FPS`);
    lines.push('');

    // Draw time
    lines.push(`**Draw Time:**`);
    lines.push(`- Baseline: ${baselineFps.avgDrawTime.toFixed(2)}ms`);
    lines.push(`- Current: ${currentFps.avgDrawTime.toFixed(2)}ms`);
    lines.push(`- Change: ${(currentFps.avgDrawTime - baselineFps.avgDrawTime).toFixed(2)}ms`);
    lines.push('');

    // Rendering operations
    const baselineOps = baseline[theme].currentMetrics;
    const currentOps = current[theme].currentMetrics;
    lines.push(`**Rendering Operations:**`);
    lines.push(`- Gradients: ${baselineOps.gradients} → ${currentOps.gradients} (${currentOps.gradients - baselineOps.gradients > 0 ? '+' : ''}${currentOps.gradients - baselineOps.gradients})`);
    lines.push(`- Shadow Blurs: ${baselineOps.shadowBlurs} → ${currentOps.shadowBlurs} (${currentOps.shadowBlurs - baselineOps.shadowBlurs > 0 ? '+' : ''}${currentOps.shadowBlurs - baselineOps.shadowBlurs})`);
    lines.push(`- Draw Calls: ${baselineOps.drawCalls} → ${currentOps.drawCalls} (${currentOps.drawCalls - baselineOps.drawCalls > 0 ? '+' : ''}${currentOps.drawCalls - baselineOps.drawCalls})`);
    lines.push('');
  }

  const report = lines.join('\n');
  fs.writeFileSync(REPORT_FILE, report, 'utf-8');
  console.log(`\n📄 Report saved to: ${REPORT_FILE}`);

  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check if dev server is running
    const response = await fetch(`http://localhost:${port}`).catch(() => null);
    if (!response) {
      console.error(`❌ Error: Dev server not running on port ${port}`);
      console.error(`   Run: npm run dev`);
      process.exit(1);
    }

    // Run tests
    const results = await runAllThemes();

    // Save and compare results based on mode
    if (mode === 'baseline') {
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`\n✅ Baseline saved to: ${BASELINE_FILE}`);

    } else if (mode === 'compare') {
      // Load baseline
      if (!fs.existsSync(BASELINE_FILE)) {
        console.error(`❌ Error: No baseline found. Run with --mode baseline first.`);
        process.exit(1);
      }

      const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
      fs.writeFileSync(LATEST_FILE, JSON.stringify(results, null, 2), 'utf-8');

      // Generate comparison report
      console.log('\n📊 Generating comparison report...');
      const report = generateReport(baseline, results);

      // Print summary to console
      console.log('\n' + report);

    } else if (mode === 'test') {
      console.log('\n✅ Test complete (not saved)');
      console.log(JSON.stringify(results, null, 2));
    }

    console.log('\n✅ Performance testing complete!');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
