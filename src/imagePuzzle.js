/**
 * ImagePuzzle – state management for image jigsaw puzzles.
 * Fixed layout: 2 rows × 4 columns = 8 pieces.
 */
export class ImagePuzzle {
  constructor(sourceCanvas) {
    this.sourceCanvas = sourceCanvas;
    this.ROWS = 2;
    this.COLS = 4;
    this.TOTAL_PIECES = this.ROWS * this.COLS;

    const pieceW = sourceCanvas.width / this.COLS;
    const pieceH = sourceCanvas.height / this.ROWS;

    this.pieces = [];
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        this.pieces.push({
          index: row * this.COLS + col,
          sx: col * pieceW,
          sy: row * pieceH,
          sw: pieceW,
          sh: pieceH
        });
      }
    }

    this.collectedPieces = new Array(this.TOTAL_PIECES).fill(false);
  }

  getPiece(index) {
    return this.pieces[index] || null;
  }

  collectPiece(index) {
    if (this.collectedPieces[index]) return false;
    this.collectedPieces[index] = true;
    return true;
  }

  isComplete() {
    return this.collectedPieces.every(c => c === true);
  }

  getCollectedCount() {
    return this.collectedPieces.filter(c => c).length;
  }

  getTotalPieces() {
    return this.TOTAL_PIECES;
  }

  getAllIndices() {
    return this.pieces.map((_, i) => i);
  }

  resetCollected() {
    this.collectedPieces.fill(false);
  }
}
