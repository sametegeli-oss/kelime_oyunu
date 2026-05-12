/* ═══════════════════════════════════════════════════════════
   WORD MODE - WORD LOADER
   Excel file upload and word management
   ═══════════════════════════════════════════════════════════ */

/**
 * Word Loader Module
 * Handles Excel file upload and word parsing
 */
const WordLoader = {
  /**
   * Initialize word loader
   */
  init() {
    this.setupFileInput();
    this.setupDropZone();
  },
  
  /**
   * Setup file input handler
   */
  setupFileInput() {
    const fileInput = DOM.get('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFile(file);
        }
      });
    }
  },
  
  /**
   * Setup drag and drop zone
   */
  setupDropZone() {
    const dropZone = DOM.get('dropZone');
    if (!dropZone) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag');
      });
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
  },
  
  /**
   * Handle file upload
   * @param {File} file - Uploaded file
   */
  async handleFile(file) {
    const errBox = DOM.get('errBox');
    if (errBox) {
      errBox.style.display = 'none';
      errBox.textContent = '';
    }
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.showError('❌ Geçersiz dosya formatı! Sadece Excel (.xlsx, .xls) veya CSV destekleniyor.');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showError('❌ Dosya çok büyük! Maksimum 10MB olmalı.');
      return;
    }
    
    try {
      showToast('📂 Dosya okunuyor...', 'info');
      
      const words = await this.parseExcel(file);
      
      if (words.length === 0) {
        this.showError('❌ Dosyada geçerli kelime bulunamadı! Excel formatını kontrol edin.');
        return;
      }
      
      // Validate words
      const validWords = this.validateWords(words);
      
      if (validWords.length === 0) {
        this.showError('❌ Geçerli kelime bulunamadı! "word" ve "translation" sütunları zorunludur.');
        return;
      }
      
      // Save words to app state
      App.state.words = validWords;
      App.state.totalWords = validWords.length;
      App.categorizeWords();
      App.saveState();
      
      showToast(`✅ ${validWords.length} kelime yüklendi!`, 'success', 3000);
      
      // Navigate to word screen
      setTimeout(() => {
        switchTab('word');
      }, 1000);
      
    } catch (error) {
      console.error('File processing error:', error);
      this.showError(`❌ Dosya işlenirken hata oluştu: ${error.message}`);
    }
  },
  
  /**
   * Parse Excel file
   * @param {File} file - Excel file
   * @returns {Promise<Array>} Parsed words
   */
  async parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          // Parse words
          const words = this.parseWordsFromJSON(jsonData);
          
          resolve(words);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Dosya okunamadı'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  },
  
  /**
   * Parse words from JSON data
   * @param {Array} jsonData - JSON array from Excel
   * @returns {Array} Parsed words
   */
  parseWordsFromJSON(jsonData) {
    const words = [];
    
    jsonData.forEach((row, index) => {
      // Map column names (case-insensitive)
      const word = this.findValue(row, ['word', 'Word', 'WORD', 'english', 'English']);
      const translation = this.findValue(row, ['translation', 'Translation', 'tr', 'TR', 'turkish', 'Turkish', 'turkce', 'Türkçe']);
      
      if (word && translation) {
        const wordObj = {
          id: generateId(),
          word: String(word).trim(),
          tr: String(translation).trim(),
          sentence: this.findValue(row, ['sentence', 'Sentence', 'example', 'Example']) || '',
          sentenceTr: this.findValue(row, ['sentenceTr', 'SentenceTr', 'sentencetr', 'exampleTr']) || '',
          phonetic: this.findValue(row, ['phonetic', 'Phonetic', 'pronunciation']) || '',
          colors: this.parseColors(this.findValue(row, ['colors', 'Colors', 'color'])),
          status: 'unseen',
          addedDate: getCurrentDate(),
          lastReviewed: null,
          reviewCount: 0,
          correctCount: 0,
          wrongCount: 0
        };
        
        words.push(wordObj);
      }
    });
    
    return words;
  },
  
  /**
   * Find value in object with multiple possible keys
   * @param {object} obj - Object to search
   * @param {Array} keys - Possible keys
   * @returns {*} Found value or null
   */
  findValue(obj, keys) {
    for (const key of keys) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key];
      }
    }
    return null;
  },
  
  /**
   * Parse colors string
   * @param {string} colorsStr - Colors string (e.g., "word:#ff0000,example:#00ff00")
   * @returns {object} Colors object
   */
  parseColors(colorsStr) {
    if (!colorsStr) return {};
    
    const colors = {};
    const pairs = String(colorsStr).split(',');
    
    pairs.forEach(pair => {
      const [word, color] = pair.split(':').map(s => s.trim());
      if (word && color) {
        colors[word] = color;
      }
    });
    
    return colors;
  },
  
  /**
   * Validate words
   * @param {Array} words - Words array
   * @returns {Array} Valid words
   */
  validateWords(words) {
    const invalidKeywords = ['verb', 'noun', 'adj', 'adjective', 'adverb', 'word', 'undefined', 'null'];
    
    return words.filter(word => {
      // Check required fields
      if (!word.word || !word.tr) return false;
      
      // Check for invalid keywords
      const wordLower = word.word.toLowerCase().trim();
      if (invalidKeywords.includes(wordLower)) return false;
      
      // Check minimum length
      if (word.word.trim().length < 2) return false;
      if (word.tr.trim().length < 2) return false;
      
      // Check for "undefined" strings
      if (word.word === 'undefined' || word.tr === 'undefined') return false;
      
      return true;
    });
  },
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errBox = DOM.get('errBox');
    if (errBox) {
      errBox.textContent = message;
      errBox.style.display = 'block';
    }
    showToast(message, 'error', 4000);
  },
  
  /**
   * Export words to Excel
   * @param {Array} words - Words to export
   * @param {string} filename - Output filename
   */
  exportToExcel(words = App.state.words, filename = 'word-mode-export.xlsx') {
    try {
      // Prepare data for export
      const exportData = words.map(word => ({
        'word': word.word,
        'translation': word.tr,
        'sentence': word.sentence || '',
        'sentenceTr': word.sentenceTr || '',
        'phonetic': word.phonetic || '',
        'colors': this.colorsToString(word.colors),
        'status': word.status || 'unseen',
        'learned_date': word.learnedDate || '',
        'review_count': word.reviewCount || 0,
        'correct_count': word.correctCount || 0,
        'wrong_count': word.wrongCount || 0
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Words');
      
      // Save file
      XLSX.writeFile(workbook, filename);
      
      showToast('✅ Excel dosyası indirildi!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('❌ Export hatası!', 'error');
    }
  },
  
  /**
   * Convert colors object to string
   * @param {object} colors - Colors object
   * @returns {string} Colors string
   */
  colorsToString(colors) {
    if (!colors || Object.keys(colors).length === 0) return '';
    
    return Object.entries(colors)
      .map(([word, color]) => `${word}:${color}`)
      .join(',');
  },
  
  /**
   * Import words from JSON
   * @param {string} jsonString - JSON string
   * @returns {Array} Imported words
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array');
      }
      
      const validWords = this.validateWords(data);
      
      if (validWords.length > 0) {
        App.state.words = validWords;
        App.state.totalWords = validWords.length;
        App.categorizeWords();
        App.saveState();
        
        showToast(`✅ ${validWords.length} kelime içe aktarıldı!`, 'success');
        return validWords;
      }
      
      throw new Error('No valid words found');
    } catch (error) {
      console.error('JSON import error:', error);
      showToast('❌ JSON import hatası!', 'error');
      return [];
    }
  },
  
  /**
   * Export words to JSON
   * @param {Array} words - Words to export
   * @returns {string} JSON string
   */
  exportToJSON(words = App.state.words) {
    try {
      const json = JSON.stringify(words, null, 2);
      
      // Create download link
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'word-mode-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('✅ JSON backup indirildi!', 'success');
      return json;
    } catch (error) {
      console.error('JSON export error:', error);
      showToast('❌ JSON export hatası!', 'error');
      return '';
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  WordLoader.init();
});

// Make globally available
window.WordLoader = WordLoader;
