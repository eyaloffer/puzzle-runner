/**
 * JigsawCollectible – a single jigsaw piece the player flies into.
 *
 * Performance notes:
 *   • The piece body (glow → white bg → clipped image → border) is pre-rendered
 *     once into an offscreen canvas and cached by pieceIndex.  Respawns reuse the
 *     cached sprite — no canvas allocation or shadowBlur on the main thread.
 *   • draw() is a single drawImage + a y-offset bob.  No rotation, no sparkles,
 *     no save/restore/translate in the hot path.  A jigsaw piece floating without
 *     spinning reads better visually anyway.
 */

// Sprite cache – survives respawns within a session; page reloads between puzzles
const _spriteCache = new Map();

export class JigsawCollectible {
  constructor(x, y, pieceIndex, sourceCanvas, pieceData, theme = null) {
    this.x = x;
    this.y = y;
    this.pieceIndex = pieceIndex;
    this.pieceData = pieceData;

    // Display size: preserve source aspect ratio, clamped to max bounds
    const aspect = pieceData.sw / pieceData.sh;
    const maxW = 75, maxH = 65;
    if (aspect > maxW / maxH) {
      this.width = maxW;
      this.height = Math.round(maxW / aspect);
    } else {
      this.height = maxH;
      this.width = Math.round(maxH * aspect);
    }

    this.collected = false;
    this.offScreen = false;
    this.scrollSpeed = 3;

    // Bobbing phase (randomised so pieces don't all bob in sync)
    this.bobOffset = Math.random() * Math.PI * 2;

    // Glow padding (must match what _preRender baked in)
    const glowRadius = theme?.collectibles?.glowRadius || 15;
    this._pad = Math.ceil(glowRadius) + 2;

    // Reuse cached sprite on respawn; otherwise pre-render and cache
    if (_spriteCache.has(pieceIndex)) {
      this._sprite = _spriteCache.get(pieceIndex);
    } else {
      const glowColor = theme?.collectibles?.glowColor || '#FFD93D';
      this._sprite = _preRender(this.width, this.height, this._pad, sourceCanvas, pieceData, glowColor, glowRadius);
      _spriteCache.set(pieceIndex, this._sprite);
    }
  }

  update() {
    this.x -= this.scrollSpeed;
    this.bobOffset += 0.08;
    if (this.x + this.width < 0) this.offScreen = true;
  }

  draw(ctx) {
    if (this.collected) return;
    // Single drawImage — no save/restore, no translate, no rotate
    ctx.drawImage(this._sprite,
      this.x - this._pad,
      this.y + Math.sin(this.bobOffset) * 5 - this._pad);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y + Math.sin(this.bobOffset) * 5,
      width: this.width,
      height: this.height
    };
  }

  intersects(bounds) {
    const b = this.getBounds();
    return (
      b.x < bounds.x + bounds.width &&
      b.x + b.width > bounds.x &&
      b.y < bounds.y + bounds.height &&
      b.y + b.height > bounds.y
    );
  }

  collect() {
    this.collected = true;
  }

  isOffScreen() {
    return this.offScreen;
  }
}

// ---------------------------------------------------------------------------
// Pre-render helpers (module-level, not on the prototype)
// ---------------------------------------------------------------------------

function _preRender(width, height, pad, sourceCanvas, pieceData, glowColor, glowRadius) {
  const r = 6;

  const canvas = document.createElement('canvas');
  canvas.width  = width  + pad * 2;
  canvas.height = height + pad * 2;
  const c = canvas.getContext('2d');

  // 1. Glow + white background fill
  c.shadowColor = glowColor;
  c.shadowBlur  = glowRadius;
  c.fillStyle   = 'rgba(255,255,255,0.92)';
  c.beginPath();
  _roundRect(c, pad, pad, width, height, r);
  c.fill();
  c.shadowBlur = 0;

  // 2. Clip to rounded rect and draw the image region
  c.save();
  c.beginPath();
  _roundRect(c, pad, pad, width, height, r);
  c.clip();
  const { sx, sy, sw, sh } = pieceData;
  c.drawImage(sourceCanvas, sx, sy, sw, sh, pad, pad, width, height);
  c.restore();

  // 3. White border on top
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth   = 2.5;
  c.beginPath();
  _roundRect(c, pad, pad, width, height, r);
  c.stroke();

  return canvas;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
