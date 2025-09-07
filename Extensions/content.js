// content.js - LeetCode Assistant Extension (final)

// ---------------------- Helpers ----------------------

// Inject FontAwesome only once
function injectFontAwesome() {
  if (!document.getElementById('lextro-fontawesome')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.id = 'lextro-fontawesome';
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }
}

/**
 * Try to detect the current programming language selected in the LeetCode editor.
 * Returns string like "Python3", "Java", "C++" or "".
 */
function detectLanguage() {
  try {
    // 1. Try Monaco editor attribute
    const monaco = document.querySelector('.monaco-editor');
    if (monaco?.getAttribute('data-language')) {
      return monaco.getAttribute('data-language');
    }

    // 2. Try LeetCode language selector dropdown
    const dropdown = document.querySelector('.ant-select-selection-item');
    if (dropdown?.innerText) {
      return dropdown.innerText.trim();
    }

    // 3. Try various LeetCode specific selectors
    const selectors = [
      '.ant-select-selection-item',
      '.lang-select .selected',
      '.editor-lang-select .selected',
      '[class*="ant-select"] span',
      '.lang-select span',
      '.select2-selection__rendered',
      '.select2-selection__choice__display'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        const text = element.textContent.trim();
        if (text && /python|java|c\+\+|javascript|typescript|go|ruby|c#|rust/i.test(text)) {
          return text;
        }
      }
    }

    // 4. Fallback: check for language in code blocks
    const codeBlocks = document.querySelectorAll('pre code');
    for (const codeBlock of codeBlocks) {
      const classList = codeBlock.className.split(' ');
      const langClass = classList.find(cls => cls.startsWith('language-'));
      if (langClass) {
        return langClass.replace('language-', '').toUpperCase();
      }
    }

    return ''; // Return empty string instead of 'Unknown' for better handling
  } catch (e) {
    console.error('Error detecting language:', e);
    return '';
  }
}

// Alias for backward compatibility
const getCurrentLanguage = detectLanguage;

// ---------------------- UI (FAB + Side panel) ----------------------

function createFloatingButton() {
  if (document.getElementById('lextro-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'lextro-fab';
  fab.innerHTML = '<i class="fas fa-robot"></i>';
  fab.title = 'Open Lextro Assistant';
  
  Object.assign(fab.style, {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    color: 'white',
    border: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    zIndex: '10000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
    transition: 'all 0.3s ease'
  });

  fab.addEventListener('mouseover', () => {
    fab.style.transform = 'scale(1.1)';
    fab.style.backgroundColor = '#2a2a2a';
  });

  fab.addEventListener('mouseout', () => {
    fab.style.transform = 'scale(1)';
    fab.style.backgroundColor = '#1a1a1a';
  });

  fab.addEventListener('click', toggleSidePanel);

  document.body.appendChild(fab);
  injectFontAwesome();
}

function toggleSidePanel() {
  const sidePanel = document.getElementById('lextro-sidepanel');

  if (sidePanel) {
    const isVisible = sidePanel.style.right === '0px';
    sidePanel.style.right = isVisible ? '-400px' : '0';
    document.body.style.overflow = isVisible ? '' : 'hidden';

    const fab = document.getElementById('lextro-fab');
    if (fab) fab.innerHTML = isVisible ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-times"></i>';
    return;
  }

  // create panel + iframe
  const panel = document.createElement('div');
  panel.id = 'lextro-sidepanel';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '400px',
    height: '100%',
    backgroundColor: '#ffffff',
    boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
    zIndex: '9999',
    transition: 'right 0.3s ease',
    overflowY: 'auto'
  });

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidepanel.html');
  Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none' });

  panel.appendChild(iframe);
  document.body.appendChild(panel);

  const fab = document.getElementById('lextro-fab');
  if (fab) fab.innerHTML = '<i class="fas fa-times"></i>';

  // overlay
  const overlay = document.createElement('div');
  overlay.id = 'lextro-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: '9998',
    display: 'block'
  });

  overlay.addEventListener('click', () => {
    toggleSidePanel();
    if (document.getElementById('lextro-overlay')) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // message listener
  window.addEventListener('message', handlePanelMessage);
}

// ---------------------- Data Extraction ----------------------

function extractProblemData() {
  try {
    // Extract title from URL (e.g., 'add-two-numbers' from 'https://leetcode.com/problems/add-two-numbers/')
    let title = 'Unknown Problem';
    const urlMatch = window.location.href.match(/problems\/([^/]+)/);
    if (urlMatch && urlMatch[1]) {
      // Convert kebab-case to Title Case with spaces
      title = urlMatch[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Extract difficulty
    const difficultyElement = document.querySelector('div[diff]') || 
                             document.querySelector('div[data-difficulty]');
    let difficulty = difficultyElement ? difficultyElement.textContent.trim().toLowerCase() : 'medium';
    
    // Extract description
    const descriptionElement = document.querySelector('div[data-cy="description"]') || 
                              document.querySelector('.question-content__1YGF');
    const description = descriptionElement ? descriptionElement.textContent.trim() : '';
    
    // Extract examples
    const examples = [];
    const exampleElements = document.querySelectorAll('pre');
    exampleElements.forEach((el, i) => {
      const text = el.textContent.trim();
      if (text.startsWith('Input:') || text.startsWith('Input \n')) {
        examples.push({
          input: text,
          output: exampleElements[i + 1]?.textContent.trim() || ''
        });
      }
    });
    
    // Extract constraints
    const constraints = [];
    const constraintElements = document.querySelectorAll('ul li, .question-content__JfgR ul li');
    constraintElements.forEach(el => {
      const text = el.textContent.trim();
      if (text) constraints.push(text);
    });
    
    return {
      title,
      difficulty,
      description,
      examples,
      constraints,
      url: window.location.href
    };
  } catch (error) {
    console.error('Error extracting problem data:', error);
    return null;
  }
}

function getCurrentCode() {
  try {
    // Try to get code from the editor
    const codeMirror = document.querySelector('.CodeMirror');
    if (codeMirror && window.CodeMirror) {
      return window.CodeMirror.getInstance(codeMirror).getValue();
    }
    
    // Fallback to textarea
    const textarea = document.querySelector('textarea');
    if (textarea) return textarea.value;
    
    // Try to find code in pre tags
    const pre = document.querySelector('pre');
    if (pre) return pre.textContent;
    
    return '';
  } catch (error) {
    console.error('Error getting current code:', error);
    return '';
  }
}

// ---------------------- Messaging / Scraping ----------------------

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProblemData') {
    console.log('Content script received getProblemData request');
    try {
      const problemData = extractProblemData();
      const code = getCurrentCode();
      const language = detectLanguage();
      
      console.log('Sending problem data to background:', { 
        ...problemData, 
        hasCode: !!code,
        detectedLanguage: language 
      });
      
      // Send response back to the sender (side panel)
      sendResponse({
        success: true,
        data: {
          ...problemData,
          code,
          language,
          url: window.location.href
        }
      });
      
      // Return true to indicate we'll send a response asynchronously
      return true;
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({
        success: false,
        error: error.message
      });
      return true;
    }
  }
});

// Listen for messages from the page (for debugging)
window.addEventListener('message', (event) => {
  if (event.data?.type === 'lextro-debug') {
    console.log('Content script debug:', event.data);
  }
});

console.log('LeetCode content script loaded');

function handlePanelMessage(event) {
  const iframe = document.getElementById('lextro-sidepanel')?.querySelector('iframe');
  if (!iframe || event.source !== iframe.contentWindow) return;

  try {
    const action = event.data?.action;
    if (!action) return;

    if (action === 'closePanel') {
      toggleSidePanel();
      const overlay = document.getElementById('lextro-overlay');
      if (overlay) document.body.removeChild(overlay);
      document.body.style.overflow = '';
      return;
    }

    if (action === 'getProblemData') {
      const problemData = {
        title: (document.title || '').replace(/ - LeetCode$/i, ''),
        url: window.location.href,
        language: getCurrentLanguage()
      };
      // send back to iframe
      iframe.contentWindow.postMessage({ action: 'problemData', data: problemData }, '*');
      return;
    }
  } catch (err) {
    console.error('Error handling panel message:', err);
  }
}

// ---------------------- Init ----------------------

function init() {
  try {
    if (!window.location.href.includes('leetcode.com/problems/')) return;
    createFloatingButton();

    // SPA navigation detection (LeetCode uses client-side nav)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // remove old panel/overlay if present when navigating away
        const oldPanel = document.getElementById('lextro-sidepanel');
        const oldOverlay = document.getElementById('lextro-overlay');
        if (oldPanel) oldPanel.remove();
        if (oldOverlay) oldOverlay.remove();
        document.body.style.overflow = '';

        if (location.href.includes('leetcode.com/problems/')) {
          createFloatingButton();
        }
      }
    });

    observer.observe(document, { subtree: true, childList: true });
    // return cleanup if needed
    return () => observer.disconnect();
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Start with a small delay to ensure DOM is ready
setTimeout(() => {
  // Check if we're on a problem page
  if (window.location.href.includes('leetcode.com/problems/')) {
    // Create FAB immediately
    createFloatingButton();
    
    // Also initialize the rest
    init();
  }
}, 1000);

// Listen for SPA navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (location.href.includes('leetcode.com/problems/')) {
      // Small delay to ensure page has updated
      setTimeout(createFloatingButton, 500);
    }
  }
});

// Start observing the document with the configured parameters
observer.observe(document, { subtree: true, childList: true });
