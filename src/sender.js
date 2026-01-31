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

// Track selected emoji
let selectedEmoji = '🐦';

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

// Generate link when button is clicked
generateBtn.addEventListener('click', () => {
  const phrase = phraseInput.value.trim();

  if (!phrase) {
    alert('Please enter a word or phrase first!');
    return;
  }

  // Use custom emoji if entered
  const emoji = customEmojiInput.value ? [...customEmojiInput.value][0] : selectedEmoji;

  // Encode the phrase
  const encoded = encodeToUrlSafe(phrase);

  // Create the game URL with emoji parameter
  const baseUrl = window.location.origin + window.location.pathname.replace('sender.html', '');
  const gameUrl = `${baseUrl}game.html?p=${encoded}&e=${encodeURIComponent(emoji)}`;

  // Display the link
  generatedLink.value = gameUrl;
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
