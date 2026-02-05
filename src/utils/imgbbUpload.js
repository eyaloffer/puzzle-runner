/**
 * Image upload – provider-swappable module.
 *
 * Current provider: Litterbox (litterbox.catbox.moe)
 *   • Completely anonymous – no API key required.
 *   • Allowed durations: "1h" | "12h" | "24h" | "72h"
 *   • Response body is the raw URL (plain text).
 *
 * To swap providers in the future just replace the constants and
 * the fetch block inside uploadImage().  The exported signature
 *   uploadImage(File) → Promise<string>          (resolves to the hosted URL)
 * must stay the same.
 */

const UPLOAD_URL = 'https://litterbox.catbox.moe/resources/internals/api.php';
const UPLOAD_DURATION = '72h';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('time', UPLOAD_DURATION);
  formData.append('fileToUpload', file);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }

  const url = (await response.text()).trim();

  if (!url.startsWith('http')) {
    throw new Error('Upload failed: unexpected response.');
  }

  return url;
}
