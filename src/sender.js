import { encodeToUrlSafe } from './utils/urlEncoding.js';
import { uploadImage } from './utils/imgbbUpload.js';

// DOM elements
const phraseInput = document.getElementById('phraseInput');
const generateBtn = document.getElementById('generateBtn');
const linkSection = document.getElementById('linkSection');
const generatedLink = document.getElementById('generatedLink');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copySuccess');
const emojiGrid = document.getElementById('emojiGrid');
const customEmojiInput = document.getElementById('customEmojiInput');
const themeGrid = document.getElementById('themeGrid');
const errorMessage = document.getElementById('errorMessage');
const shareTwitterBtn = document.getElementById('shareTwitterBtn');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

// Tab / image-mode elements
const tabBtns = document.querySelectorAll('.tab-btn');
const textTabContent = document.getElementById('textTabContent');
const imageTabContent = document.getElementById('imageTabContent');
const imageUploadInput = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewWrap = document.getElementById('imagePreviewWrap');
const removeImageBtn = document.getElementById('removeImageBtn');

// Validation constants
const MIN_PHRASE_LENGTH = 2;
const MAX_PHRASE_LENGTH = 100;

// Track selected emoji and theme
let selectedEmoji = '🐦';
let selectedTheme = 'classic';
let currentGameUrl = '';

// Active tab and selected image file
let activeTab = 'text';
let selectedFile = null;

// Handle emoji grid selection
emojiGrid.addEventListener('click', (e) => {
  const option = e.target.closest('.emoji-option');
  if (!option) return;

  // Update selection
  emojiGrid.querySelectorAll('.emoji-option').forEach(btn => btn.classList.remove('selected'));
  option.classList.add('selected');
  customEmojiInput.classList.remove('selected');
  customEmojiInput.value = '';
  selectedEmoji = option.dataset.emoji;
});

// Handle custom emoji input
customEmojiInput.addEventListener('input', (e) => {
  const value = e.target.value;
  if (value) {
    // Deselect grid options
    emojiGrid.querySelectorAll('.emoji-option').forEach(btn => btn.classList.remove('selected'));
    customEmojiInput.classList.add('selected');
    // Take first emoji/character
    selectedEmoji = [...value][0];
  }
});

customEmojiInput.addEventListener('focus', () => {
  if (customEmojiInput.value) {
    emojiGrid.querySelectorAll('.emoji-option').forEach(btn => btn.classList.remove('selected'));
    customEmojiInput.classList.add('selected');
  }
});

// Handle theme grid selection
themeGrid.addEventListener('click', (e) => {
  const option = e.target.closest('.theme-option');
  if (!option || option.classList.contains('disabled')) return;

  // Update selection
  themeGrid.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('selected'));
  option.classList.add('selected');
  selectedTheme = option.dataset.theme;
});

// Disable / re-enable non-classic themes (image mode only supports classic for now)
function setThemesDisabled(disabled) {
  themeGrid.querySelectorAll('.theme-option').forEach(btn => {
    if (btn.dataset.theme === 'classic') return;
    btn.classList.toggle('disabled', disabled);
    if (disabled && btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      themeGrid.querySelector('[data-theme="classic"]').classList.add('selected');
      selectedTheme = 'classic';
    }
  });
}

// --- Tab switching ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = tab;

    textTabContent.classList.toggle('hidden', tab !== 'text');
    imageTabContent.classList.toggle('hidden', tab !== 'image');

    setThemesDisabled(tab === 'image');
    hideError();
    linkSection.classList.add('hidden');
  });
});

// --- Image upload / preview ---
imageUploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showError('Please select an image file (JPG, PNG, GIF).');
    return;
  }

  selectedFile = file;
  imagePreview.src = URL.createObjectURL(file);
  imagePreviewWrap.classList.remove('hidden');
  hideError();
});

removeImageBtn.addEventListener('click', () => {
  selectedFile = null;
  imageUploadInput.value = '';
  imagePreview.src = '';
  imagePreviewWrap.classList.add('hidden');
});

// Validate phrase input
function validatePhrase(phrase) {
  if (!phrase) {
    return 'Please enter a word or phrase';
  }

  if (phrase.length < MIN_PHRASE_LENGTH) {
    return `Phrase must be at least ${MIN_PHRASE_LENGTH} characters`;
  }

  if (phrase.length > MAX_PHRASE_LENGTH) {
    return `Phrase must be ${MAX_PHRASE_LENGTH} characters or less`;
  }

  // Check for at least one letter or number (not just spaces/punctuation)
  if (!/[\p{L}\p{N}]/u.test(phrase)) {
    return 'Phrase must contain at least one letter or number';
  }

  return null; // No error
}

// Validate emoji input
function validateEmoji(emoji) {
  if (!emoji) {
    return 'Please select or enter a character';
  }
  return null;
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
  errorMessage.classList.add('hidden');
}

// Generate link when button is clicked (async for image upload)
generateBtn.addEventListener('click', async () => {
  // Shared emoji validation
  const emoji = customEmojiInput.value ? [...customEmojiInput.value][0] : selectedEmoji;
  const emojiError = validateEmoji(emoji);
  if (emojiError) { showError(emojiError); return; }

  hideError();

  const baseUrl = window.location.origin + window.location.pathname.replace('sender.html', '');

  if (activeTab === 'text') {
    // --- Text mode (existing logic) ---
    const phrase = phraseInput.value.trim();
    const phraseError = validatePhrase(phrase);
    if (phraseError) { showError(phraseError); return; }

    const encoded = encodeToUrlSafe(phrase);
    currentGameUrl = `${baseUrl}game.html?p=${encoded}&e=${encodeURIComponent(emoji)}&t=${selectedTheme}`;
  } else {
    // --- Image mode ---
    if (!selectedFile) {
      showError('Please select an image first.');
      return;
    }

    // Show loading state
    generateBtn.textContent = 'Uploading…';
    generateBtn.disabled = true;

    try {
      const displayUrl = await uploadImage(selectedFile);
      currentGameUrl = `${baseUrl}game.html?m=img&i=${encodeURIComponent(displayUrl)}&e=${encodeURIComponent(emoji)}&t=${selectedTheme}`;
    } catch (err) {
      showError(err.message);
      return;
    } finally {
      generateBtn.textContent = 'Generate Link';
      generateBtn.disabled = false;
    }
  }

  // Display the link
  generatedLink.value = currentGameUrl;
  linkSection.classList.remove('hidden');
  copySuccess.classList.add('hidden');
});

// Copy link to clipboard
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(generatedLink.value);

    // Show success message
    copySuccess.classList.remove('hidden');

    // Hide it after 3 seconds
    setTimeout(() => {
      copySuccess.classList.add('hidden');
    }, 3000);
  } catch (err) {
    // Fallback for older browsers
    generatedLink.select();
    document.execCommand('copy');

    copySuccess.classList.remove('hidden');
    setTimeout(() => {
      copySuccess.classList.add('hidden');
    }, 3000);
  }
});

// Allow generating link with Enter key
phraseInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    generateBtn.click();
  }
});

// Clear error on input
phraseInput.addEventListener('input', hideError);

// Share button handlers
shareTwitterBtn.addEventListener('click', () => {
  if (!currentGameUrl) return;
  const text = "I created a Birdle for you! Can you solve my secret phrase?";
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentGameUrl)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
});

shareWhatsAppBtn.addEventListener('click', () => {
  if (!currentGameUrl) return;
  const text = `I created a Birdle for you! Can you solve my secret phrase?\n${currentGameUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
});
