/* ═══════════════════════════════════════════════════════════
   WORD MODE - APPLICATION STATE
   Centralized State Management
   ═══════════════════════════════════════════════════════════ */

/**
 * Application State Manager
 * Centralized state management with reactivity
 */
const App = {
  // Application state
  state: {
    words: [],
    currentIndex: 0,
    currentList: 'default',
    filteredWords: [],
    score: 0,
    totalWords: 0,
    learnedWords: [],
    failedWords: [],
    unseenWords: [],
    
    // UI state
    currentScreen: 'sc-upload',
    isLoading: false,
    
    // User settings
    settings: {
      darkMode: true,
      autoPlay: false,
      showImages: true,
      textSize: 14,
      highlightWords: true,
      soundEnabled: true,
      vibrationEnabled: true
    },
    
    // User profile
    profile: {
      level: 1,
      xp: 0,
      streak: 0,
      totalLearned: 0,
      studyTime: 0,
      lastStudyDate: null
    },
    
    // Statistics
    stats: {
      totalTests: 0,
      totalCorrect: 0,
      totalWrong: 0,
      averageScore: 0,
      studyDays: [],
      weakWords: {}
    }
  },
  
  // State listeners
  listeners: {},
  
  /**
   * Initialize application
   */
  async init() {
    console.log('🚀 Initializing Word Mode...');
    
    try {
      // Load saved state
      await this.loadState();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize modules
      this.initModules();
      
      // Check for resume
      this.checkResume();
      
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ Init error:', error);
      showToast('Başlatma hatası!', 'error');
    }
  },
  
  /**
   * Load state from storage
   */
  async loadState() {
    // Load words
    const words = Storage.get(CONSTANTS.STORAGE_KEYS.WORDS, []);
    if (words.length > 0) {
      this.state.words = words;
      this.state.totalWords = words.length;
      this.categorizeWords();
    }
    
    // Load current list
    this.state.currentList = Storage.get(CONSTANTS.STORAGE_KEYS.CURRENT_LIST, 'default');
    
    // Load settings
    const savedSettings = Storage.get(CONSTANTS.STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      this.state.settings = { ...this.state.settings, ...savedSettings };
    }
    
    // Load profile
    const savedProfile = Storage.get(CONSTANTS.STORAGE_KEYS.USER_PROFILE);
    if (savedProfile) {
      this.state.profile = { ...this.state.profile, ...savedProfile };
    }
    
    // Load stats
    const savedStats = Storage.get(CONSTANTS.STORAGE_KEYS.STATS);
    if (savedStats) {
      this.state.stats = { ...this.state.stats, ...savedStats };
    }
    
    // Update streak
    this.updateStreak();
  },
  
  /**
   * Save state to storage
   */
  saveState() {
    try {
      Storage.set(CONSTANTS.STORAGE_KEYS.WORDS, this.state.words);
      Storage.set(CONSTANTS.STORAGE_KEYS.CURRENT_LIST, this.state.currentList);
      Storage.set(CONSTANTS.STORAGE_KEYS.SETTINGS, this.state.settings);
      Storage.set(CONSTANTS.STORAGE_KEYS.USER_PROFILE, this.state.profile);
      Storage.set(CONSTANTS.STORAGE_KEYS.STATS, this.state.stats);
      return true;
    } catch (error) {
      console.error('Save state error:', error);
      return false;
    }
  },
  
  /**
   * Update state and notify listeners
   * @param {string} key - State key
   * @param {*} value - New value
   */
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    
    // Notify listeners
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Listener error for ${key}:`, error);
        }
      });
    }
    
    // Auto-save important state changes
    if (['words', 'profile', 'stats'].includes(key)) {
      debounce(() => this.saveState(), 1000)();
    }
  },
  
  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  },
  
  /**
   * Categorize words into learned/failed/unseen
   */
  categorizeWords() {
    this.state.learnedWords = this.state.words.filter(w => w.status === 'learned');
    this.state.failedWords = this.state.words.filter(w => w.status === 'failed');
    this.state.unseenWords = this.state.words.filter(w => !w.status || w.status === 'unseen');
    
    this.state.filteredWords = [...this.state.words];
  },
  
  /**
   * Filter words by status
   * @param {string} filter - Filter type (all, learned, failed, unseen)
   */
  filterWords(filter = 'all') {
    switch(filter) {
      case 'learned':
        this.state.filteredWords = this.state.learnedWords;
        break;
      case 'failed':
        this.state.filteredWords = this.state.failedWords;
        break;
      case 'unseen':
        this.state.filteredWords = this.state.unseenWords;
        break;
      default:
        this.state.filteredWords = this.state.words;
    }
    
    this.state.currentIndex = 0;
    this.setState('filteredWords', this.state.filteredWords);
  },
  
  /**
   * Get current word
   * @returns {object|null} Current word
   */
  getCurrentWord() {
    if (this.state.filteredWords.length === 0) {
      return null;
    }
    return this.state.filteredWords[this.state.currentIndex];
  },
  
  /**
   * Move to next word
   */
  nextWord() {
    if (this.state.currentIndex < this.state.filteredWords.length - 1) {
      this.state.currentIndex++;
      this.setState('currentIndex', this.state.currentIndex);
      return true;
    }
    return false;
  },
  
  /**
   * Move to previous word
   */
  prevWord() {
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.setState('currentIndex', this.state.currentIndex);
      return true;
    }
    return false;
  },
  
  /**
   * Mark word as learned
   * @param {object} word - Word to mark
   */
  markAsLearned(word) {
    const index = this.state.words.findIndex(w => w.word === word.word);
    if (index !== -1) {
      this.state.words[index].status = 'learned';
      this.state.words[index].learnedDate = getCurrentDate();
      
      this.categorizeWords();
      this.updateProfile('learned');
      this.saveState();
      
      if (this.state.settings.soundEnabled) {
        playSuccessSound();
      }
      if (this.state.settings.vibrationEnabled) {
        vibrate(50);
      }
    }
  },
  
  /**
   * Mark word as failed
   * @param {object} word - Word to mark
   */
  markAsFailed(word) {
    const index = this.state.words.findIndex(w => w.word === word.word);
    if (index !== -1) {
      this.state.words[index].status = 'failed';
      this.state.words[index].failCount = (this.state.words[index].failCount || 0) + 1;
      
      // Track weak words
      if (!this.state.stats.weakWords[word.word]) {
        this.state.stats.weakWords[word.word] = {
          attempts: 0,
          correct: 0,
          wrong: 0
        };
      }
      this.state.stats.weakWords[word.word].attempts++;
      this.state.stats.weakWords[word.word].wrong++;
      
      this.categorizeWords();
      this.saveState();
      
      if (this.state.settings.soundEnabled) {
        playErrorSound();
      }
    }
  },
  
  /**
   * Update user profile
   * @param {string} action - Action type
   */
  updateProfile(action) {
    switch(action) {
      case 'learned':
        this.state.profile.totalLearned++;
        this.state.profile.xp += 10;
        break;
      case 'quiz_correct':
        this.state.profile.xp += 5;
        break;
      case 'quiz_complete':
        this.state.profile.xp += 20;
        break;
    }
    
    // Check for level up
    const xpForNextLevel = this.state.profile.level * 100;
    if (this.state.profile.xp >= xpForNextLevel) {
      this.state.profile.level++;
      this.state.profile.xp = this.state.profile.xp - xpForNextLevel;
      showToast(`🎉 Seviye ${this.state.profile.level}'e yükseldin!`, 'success', 3000);
    }
    
    this.setState('profile', this.state.profile);
  },
  
  /**
   * Update streak
   */
  updateStreak() {
    const today = getCurrentDate();
    const lastStudyDate = this.state.profile.lastStudyDate;
    
    if (!lastStudyDate) {
      // First time studying
      this.state.profile.streak = 1;
      this.state.profile.lastStudyDate = today;
    } else if (lastStudyDate === today) {
      // Already studied today
      return;
    } else {
      const lastDate = new Date(lastStudyDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        this.state.profile.streak++;
      } else {
        // Streak broken
        this.state.profile.streak = 1;
      }
      
      this.state.profile.lastStudyDate = today;
    }
    
    this.saveState();
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Screen navigation
    window.showScreen = (screenId) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const screen = DOM.get(screenId);
      if (screen) {
        screen.classList.add('active');
        this.state.currentScreen = screenId;
      }
    };
    
    // Tab switching
    window.switchTab = (tab) => {
      const tabs = ['upload', 'word', 'stats', 'settings'];
      if (tabs.includes(tab)) {
        showScreen(`sc-${tab}`);
        
        // Update bottom nav
        document.querySelectorAll('.bnav-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const navBtn = document.querySelector(`.bnav-btn[onclick*="${tab}"]`);
        if (navBtn) {
          navBtn.classList.add('active');
        }
      }
    };
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        this.nextWord();
      } else if (e.key === 'ArrowLeft') {
        this.prevWord();
      }
    });
  },
  
  /**
   * Initialize modules
   */
  initModules() {
    // Initialize word display if words are loaded
    if (this.state.words.length > 0) {
      this.filterWords('all');
    }
  },
  
  /**
   * Check for resume capability
   */
  checkResume() {
    if (this.state.words.length > 0) {
      const resumeBanner = DOM.get('resumeBanner');
      if (resumeBanner) {
        resumeBanner.style.display = 'block';
        resumeBanner.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px">
            <div style="flex:1">
              <div style="font-size:14px;font-weight:800;color:var(--text)">
                📚 ${this.state.totalWords} kelime yüklü
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">
                ${this.state.learnedWords.length} öğrenildi • ${this.state.unseenWords.length} görülmedi
              </div>
            </div>
            <button class="btn btn-sm btn-green" onclick="switchTab('word')">
              Devam Et →
            </button>
          </div>
        `;
      }
    }
  },
  
  /**
   * Get app statistics
   * @returns {object} App stats
   */
  getStats() {
    return {
      totalWords: this.state.totalWords,
      learned: this.state.learnedWords.length,
      failed: this.state.failedWords.length,
      unseen: this.state.unseenWords.length,
      learnedPercentage: calculatePercentage(this.state.learnedWords.length, this.state.totalWords),
      level: this.state.profile.level,
      xp: this.state.profile.xp,
      streak: this.state.profile.streak,
      totalTests: this.state.stats.totalTests,
      averageScore: this.state.stats.averageScore
    };
  },
  
  /**
   * Reset application state
   */
  reset() {
    if (confirm('⚠️ Tüm veriler silinecek. Emin misiniz?')) {
      Storage.clear();
      location.reload();
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Make App globally available
window.App = App;
