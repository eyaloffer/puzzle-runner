/**
 * Theme configuration for Birdle game
 * Defines visual styles for obstacles, backgrounds, clouds, collectibles, and trails
 */

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    emoji: '🏞️',

    sky: {
      gradient: ['#87CEEB', '#B0E0F0', '#E0F6FF']
    },

    obstacles: {
      type: 'pipe',
      colors: ['#2E7D32', '#4CAF50', '#81C784', '#4CAF50', '#2E7D32'], // 5-stop gradient
      capColors: ['#1B5E20', '#2E7D32', '#4CAF50', '#2E7D32', '#1B5E20'],
      outlineColor: '#1B5E20',
      capHeight: 30,
      capOverhang: 5
    },

    clouds: {
      type: 'fluffy',
      color: 'rgba(255, 255, 255, 0.9)'
    },

    collectibles: {
      bgColor: '#FFD93D',
      innerColor: '#FFF5CC',
      textColor: '#1E3A5F',
      glowColor: '#FFD93D',
      glowRadius: 15
    },

    trail: {
      color: '#5B9BD5',
      glowColor: '#FFD93D'
    }
  },

  evil: {
    id: 'evil',
    name: 'Evil',
    emoji: '🔥',

    sky: {
      gradient: ['#8B0000', '#4a0000', '#1a0000']
    },

    obstacles: {
      type: 'spike',
      colors: ['#1a0000', '#2a0000', '#3a0000', '#2a0000', '#1a0000'],
      glowColor: '#DC143C',
      outlineColor: '#000000',
      capHeight: 40, // Taller spikes
      capOverhang: 0
    },

    clouds: {
      type: 'fire',
      color: 'rgba(255, 69, 0, 0.7)',
      secondaryColor: 'rgba(255, 140, 0, 0.5)'
    },

    collectibles: {
      bgColor: '#DC143C',
      innerColor: '#8B0000',
      textColor: '#FFD700',
      glowColor: '#FF4500',
      glowRadius: 20
    },

    trail: {
      color: '#FF4500',
      glowColor: '#DC143C'
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',

    sky: {
      gradient: ['#004B87', '#0066AA', '#4A90E2']
    },

    obstacles: {
      type: 'coral',
      colors: ['#FF6B9D', '#FF8FAB', '#FFB3C1', '#FF8FAB', '#FF6B9D'],
      secondaryColors: ['#7FBA00', '#90C31F', '#A6D85B', '#90C31F', '#7FBA00'],
      outlineColor: '#D14D72',
      capHeight: 25,
      capOverhang: 8
    },

    clouds: {
      type: 'bubbles',
      color: 'rgba(173, 216, 230, 0.4)',
      innerColor: 'rgba(255, 255, 255, 0.3)'
    },

    collectibles: {
      bgColor: '#F0F8FF',
      innerColor: '#FFFFFF',
      textColor: '#004B87',
      glowColor: '#00CED1',
      glowRadius: 18
    },

    trail: {
      color: '#00CED1',
      glowColor: '#4A90E2'
    }
  },

  space: {
    id: 'space',
    name: 'Space',
    emoji: '🌌',

    sky: {
      gradient: ['#0a0a1a', '#15152e', '#1a1a2e'],
      stars: true // Special flag for star background
    },

    obstacles: {
      type: 'asteroid',
      colors: ['#4A4A8A', '#6060AA', '#8080CC', '#6060AA', '#4A4A8A'],
      secondaryColors: ['#2D2D5A', '#3A3A6A', '#4A4A8A', '#3A3A6A', '#2D2D5A'],
      outlineColor: '#2D2D5A',
      glowColor: '#8080CC',
      capHeight: 35,
      capOverhang: 3,
      rotate: true // Asteroids rotate
    },

    clouds: {
      type: 'nebula',
      color: 'rgba(255, 105, 180, 0.3)',
      secondaryColor: 'rgba(147, 112, 219, 0.3)',
      tertiaryColor: 'rgba(138, 43, 226, 0.2)'
    },

    collectibles: {
      bgColor: '#FFD700',
      innerColor: '#FFED4E',
      textColor: '#1a1a2e',
      glowColor: '#FFFF00',
      glowRadius: 25,
      pulse: true // Pulsing glow effect
    },

    trail: {
      color: '#00FFFF',
      glowColor: '#00CED1'
    }
  }
};

/**
 * Get theme configuration by ID
 * @param {string} themeId - The theme identifier
 * @returns {object} Theme configuration object
 */
export function getTheme(themeId) {
  return THEMES[themeId] || THEMES.classic;
}

/**
 * Get all available theme IDs
 * @returns {string[]} Array of theme IDs
 */
export function getThemeIds() {
  return Object.keys(THEMES);
}

/**
 * Get theme metadata for UI display
 * @returns {Array} Array of {id, name, emoji} objects
 */
export function getThemeMetadata() {
  return Object.values(THEMES).map(theme => ({
    id: theme.id,
    name: theme.name,
    emoji: theme.emoji
  }));
}
