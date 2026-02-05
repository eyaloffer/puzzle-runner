const FALLBACK_DOG_URL = new URL('../assets/dog-fallback.jpg', import.meta.url).href;

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadImage(url) {
  try {
    const image = await loadImg(url);
    return { image, usedFallback: false };
  } catch {
    const fallback = await loadImg(FALLBACK_DOG_URL);
    return { image: fallback, usedFallback: true };
  }
}

export function resizeImage(image, maxWidth, maxHeight) {
  const scaleX = maxWidth / image.width;
  const scaleY = maxHeight / image.height;
  const scale = Math.min(scaleX, scaleY, 1); // don't upscale

  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function loadAndResize(url, maxWidth, maxHeight) {
  const { image, usedFallback } = await loadImage(url);
  const canvas = resizeImage(image, maxWidth, maxHeight);
  return { canvas, usedFallback };
}
