import { encodeToUrlSafe } from './utils/urlEncoding.js';

// DOM elements
const phraseInput = document.getElementById('phraseInput');
const generateBtn = document.getElementById('generateBtn');
const linkSection = document.getElementById('linkSection');
const generatedLink = document.getElementById('generatedLink');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copySuccess');
const emojiGrid = document.getElementById('emojiGrid');
const customEmojiInput = document.getElementById('customEmojiInput');
const errorMessage = document.getElementById('errorMessage');
const shareTwitterBtn = document.getElementById('shareTwitterBtn');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

// Validation constants
const MIN_PHRASE_LENGTH = 2;
const MAX_PHRASE_LENGTH = 100;

// Track selected emoji
let selectedEmoji = '🐦';
let currentGameUrl = '';

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

// Generate link when button is clicked
generateBtn.addEventListener('click', () => {
  const phrase = phraseInput.value.trim();

  // Validate phrase
  const phraseError = validatePhrase(phrase);
  if (phraseError) {
    showError(phraseError);
    return;
  }

  // Use custom emoji if entered
  const emoji = customEmojiInput.value ? [...customEmojiInput.value][0] : selectedEmoji;

  // Validate emoji
  const emojiError = validateEmoji(emoji);
  if (emojiError) {
    showError(emojiError);
    return;
  }

  // Hide any previous error
  hideError();

  // Encode the phrase
  const encoded = encodeToUrlSafe(phrase);

  // Create the game URL with emoji parameter
  const baseUrl = window.location.origin + window.location.pathname.replace('sender.html', '');
  currentGameUrl = `${baseUrl}game.html?p=${encoded}&e=${encodeURIComponent(emoji)}`;

  // Display the link
  generatedLink.value = currentGameUrl;
  linkSection.classList.remove('hidden');

  // Hide success message if it was showing
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
