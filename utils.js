/* ═══════════════════════════════════════════════════════════
   WORD MODE - UTILITIES
   Helper Functions & Common Operations
   ═══════════════════════════════════════════════════════════ */

/**
 * Storage Manager - Centralized localStorage handling with caching
 */
const Storage = {
  cache: {},
  
  /**
   * Get item from storage with caching
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Stored value or default
   */
  get(key, defaultValue = null) {
    // Return from cache if available
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }
    
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      
      const parsed = JSON.parse(item);
      this.cache[key] = parsed;
      return parsed;
    } catch (error) {
      console.error(`Storage.get error for key "${key}":`, error);
      return defaultValue;
    }
  },
  
  /**
   * Set item in storage with caching
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      this.cache[key] = value;
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Clearing old data...');
        this.clearOldData();
        // Try again after clearing
        try {
          localStorage.setItem(key, JSON.stringify(value));
          this.cache[key] = value;
          return true;
        } catch (retryError) {
          console.error('Storage still full after cleanup:', retryError);
          return false;
        }
      }
      console.error(`Storage.set error for key "${key}":`, error);
      return false;
    }
  },
  
  /**
   * Remove item from storage and cache
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      delete this.cache[key];
    } catch (error) {
      console.error(`Storage.remove error for key "${key}":`, error);
    }
  },
  
  /**
   * Clear all storage and cache
   */
  clear() {
    try {
      localStorage.clear();
      this.cache = {};
    } catch (error) {
      console.error('Storage.clear error:', error);
    }
  },
  
  /**
   * Clear old/unused data to free up space
   */
  clearOldData() {
    const keysToKeep = ['words', 'currentList', 'userProfile', 'settings'];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        this.remove(key);
      }
    });
  },
  
  /**
   * Get storage usage info
   * @returns {object} Storage stats
   */
  getUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    
    return {
      used: total,
      usedKB: (total / 1024).toFixed(2),
      usedMB: (total / (1024 * 1024)).toFixed(2),
      percentage: ((total / (5 * 1024 * 1024)) * 100).toFixed(2)
    };
  }
};

/**
 * DOM Manager - Cached element references
 */
const DOM = {
  cache: {},
  
  /**
   * Get element by ID with caching
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  get(id) {
    if (!this.cache[id]) {
      this.cache[id] = document.getElementById(id);
    }
    return this.cache[id];
  },
  
  /**
   * Query selector with caching
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null}
   */
  query(selector) {
    if (!this.cache[selector]) {
      this.cache[selector] = document.querySelector(selector);
    }
    return this.cache[selector];
  },
  
  /**
   * Query all elements
   * @param {string} selector - CSS selector
   * @returns {NodeList}
   */
  queryAll(selector) {
    return document.querySelectorAll(selector);
  },
  
  /**
   * Clear cache (useful after dynamic content changes)
   */
  clearCache() {
    this.cache = {};
  }
};

/**
 * Debounce function - Limit function execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - Ensure function runs at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Escape HTML entities
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'success', duration = 3000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Format number with separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR').format(num);
}

/**
 * Shuffle array in place
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random elements from array
 * @param {Array} array - Source array
 * @param {number} count - Number of elements to get
 * @returns {Array} Random elements
 */
function getRandomElements(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Deep clone error:', error);
    return obj;
  }
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if date is today
 * @param {string} dateString - Date string to check
 * @returns {boolean}
 */
function isToday(dateString) {
  return dateString === getCurrentDate();
}

/**
 * Get time ago string
 * @param {Date|string} date - Date to compare
 * @returns {string} Time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diff = now - past;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  if (minutes > 0) return `${minutes} dakika önce`;
  return 'Az önce';
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @returns {number} Percentage (0-100)
 */
function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Kopyalandı!', 'success', 2000);
    return true;
  } catch (error) {
    console.error('Clipboard error:', error);
    showToast('❌ Kopyalanamadı', 'error', 2000);
    return false;
  }
}

/**
 * Vibrate device (if supported)
 * @param {number} duration - Vibration duration in ms
 */
function vibrate(duration = 50) {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

/**
 * Play success sound
 */
function playSuccessSound() {
  // Using Web Audio API for better performance
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.log('Audio not supported');
  }
}

/**
 * Play error sound
 */
function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.log('Audio not supported');
  }
}

/**
 * Constants
 */
const CONSTANTS = {
  SCORE_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
    PASS: 40
  },
  
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  
  STORAGE_KEYS: {
    WORDS: 'words',
    CURRENT_LIST: 'currentList',
    USER_PROFILE: 'userProfile',
    SETTINGS: 'settings',
    STATS: 'stats',
    STREAK: 'streak',
    SRS_DATA: 'srsData'
  },
  
  SRS_INTERVALS: {
    LEVEL_0: 1,      // 1 day
    LEVEL_1: 3,      // 3 days
    LEVEL_2: 7,      // 1 week
    LEVEL_3: 14,     // 2 weeks
    LEVEL_4: 30,     // 1 month
    LEVEL_5: 90      // 3 months
  }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Storage,
    DOM,
    debounce,
    throttle,
    sanitizeHTML,
    escapeHTML,
    showToast,
    formatNumber,
    shuffleArray,
    getRandomElements,
    deepClone,
    wait,
    getCurrentDate,
    isToday,
    getTimeAgo,
    isValidEmail,
    calculatePercentage,
    generateId,
    copyToClipboard,
    vibrate,
    playSuccessSound,
    playErrorSound,
    CONSTANTS
  };
}
