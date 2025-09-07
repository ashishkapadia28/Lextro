// DOM Elements
const problemTitle = document.getElementById('problem-title');
const problemDifficulty = document.getElementById('problem-difficulty');
const difficultyRadios = document.getElementsByName('difficulty');
const answerTypeRadios = document.getElementsByName('answer-type');
const languageRadios = document.getElementsByName('language');
const goButton = document.getElementById('go-btn');
const loadingElement = document.getElementById('loading');
const resultsElement = document.getElementById('results');
const solutionContent = document.getElementById('solution-content');
const copyButton = document.getElementById('copy-btn');
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

// Helper function to get the value of a radio group
function getRadioValue(radioGroup) {
  const selected = Array.from(radioGroup).find(radio => radio.checked);
  return selected ? selected.value : null;
}

// Theme management
const THEME_KEY = 'lextro_theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
let currentTheme = LIGHT_THEME;

// State
let problemData = {
  title: '',
  difficulty: '',
  description: '',
  examples: [],
  constraints: []
};

// Theme functions
function initTheme() {
  // Load saved theme or use system preference
  chrome.storage.local.get([THEME_KEY], (result) => {
    const savedTheme = result[THEME_KEY];
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      currentTheme = savedTheme;
    } else {
      currentTheme = systemPrefersDark ? DARK_THEME : LIGHT_THEME;
      saveTheme(currentTheme);
    }
    
    applyTheme();
    updateLogo();
  });
}

function toggleTheme() {
  currentTheme = currentTheme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
  applyTheme();
  saveTheme(currentTheme);
  updateLogo();
}

function applyTheme() {
  if (currentTheme === DARK_THEME) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function saveTheme(theme) {
  chrome.storage.local.set({ [THEME_KEY]: theme });
}

function updateLogo() {
  if (logo) {
    const logoPath = currentTheme === DARK_THEME 
      ? chrome.runtime.getURL('logo/Logo_dark_bg.png')
      : chrome.runtime.getURL('logo/Logo_light_bg.png');
    
    logo.src = logoPath;
    logo.alt = `Lextro Logo - ${currentTheme} mode`;
  }
}

// Track initialization state
let isInitialized = false;
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Function to load query data if ID is present in URL
async function loadQueryFromUrl() {
  try {
    const queryId = getUrlParameter('id');
    if (!queryId) {
      console.log('[DEBUG] No query ID found in URL');
      return;
    }

    console.log(`[DEBUG] Loading query with ID: ${queryId}`);
    
    // Show loading state
    loadingElement.classList.remove('hidden');
    resultsElement.classList.add('hidden');
    
    // Clear any previous error
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
    
    // Fetch and display the query data
    const queryData = await fetchQueryData(queryId);
    
    if (!queryData) {
      throw new Error('No data returned from server');
    }
    
    displayQueryData(queryData);
    
  } catch (error) {
    console.error('[ERROR] Failed to load query:', error);
    showError(`Failed to load query: ${error.message}`);
    
    // Show a retry button
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.textContent = 'Retry Loading';
    retryButton.onclick = loadQueryFromUrl;
    
    const errorContainer = document.querySelector('.error-message') || document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <p>${error.message}</p>
    `;
    errorContainer.appendChild(retryButton);
    
    if (!document.querySelector('.error-message')) {
      document.body.appendChild(errorContainer);
    }
    
    loadingElement.classList.add('hidden');
    resultsElement.classList.add('hidden');
    
    throw error; // Re-throw to allow caller to handle the error if needed
  }
}

// Initialize the side panel
document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) return;
  isInitialized = true;
  
  console.log('Side panel loaded');
  
  // Initialize theme
  initTheme();
  updateLogo();
  
  // Set up theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Set up Go button click handler
  if (goButton) {
    goButton.addEventListener('click', handleGoClick);
  }
  
  // Debounce the problem data request to avoid too many calls
  let debounceTimer;
  const debouncedRequestProblemData = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (retryCount < MAX_RETRIES) {
        requestProblemData();
      }
    }, 500);
  };

  // Request initial problem data
  requestProblemData();
  
  // Set up a mutation observer to detect when the problem content changes
  const observer = new MutationObserver((mutations) => {
    // Only trigger if the change is relevant (not caused by our own updates)
    const isRelevantChange = mutations.some(mutation => {
      // Ignore changes to our own elements
      if (mutation.target.id === 'problem-title' || 
          mutation.target.id === 'problem-difficulty') {
        return false;
      }
      return true;
    });
    
    if (isRelevantChange) {
      debouncedRequestProblemData();
    }
  });
  
  // Start observing the problem content area for changes
  // Try multiple selectors to find the content area in different LeetCode layouts
  const contentSelectors = [
    '.problem-content', 
    '.content__1c4a',
    '.x1n2onr6',
    'div[data-track-load="description_content"]',
    'div[data-key="description"]',
    '.description__24sA',
    '.question-content__JfgR'
  ];
  
  let contentArea = null;
  for (const selector of contentSelectors) {
    contentArea = document.querySelector(selector);
    if (contentArea) break;
  }
  
  if (contentArea) {
    observer.observe(contentArea, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Load query data if ID is present in URL
  loadQueryFromUrl().catch(error => {
    console.error('Error in loadQueryFromUrl:', error);
  });

  console.log('Side panel initialization complete');
});

// Update the problem information in the UI
function updateProblemInfo() {
  console.log('Updating problem info with data:', problemData);
  
  // Update title
  if (problemData && problemData.title) {
    problemTitle.textContent = problemData.title;
    console.log('Set title to:', problemData.title);
  } else {
    console.warn('No title found in problem data');
    problemTitle.textContent = 'Problem Title';
  }
  
  // Set difficulty with appropriate styling
  if (problemData && problemData.difficulty) {
    const difficulty = problemData.difficulty.toLowerCase();
    console.log('Setting difficulty:', difficulty);
    
    problemDifficulty.textContent = problemData.difficulty;
    problemDifficulty.className = `difficulty-tag ${difficulty}`;
    
    // Auto-select the difficulty radio button
    if (difficultyRadios && difficultyRadios.length > 0) {
      const radioToSelect = Array.from(difficultyRadios).find(
        radio => radio.value === difficulty || 
                (difficulty === 'auto' && radio.value === '')
      );
      
      if (radioToSelect) {
        radioToSelect.checked = true;
        console.log('Set difficulty radio to:', difficulty);
      } else {
        console.warn('No matching difficulty radio found for:', difficulty);
      }
    } else {
      console.warn('No difficulty radio buttons found');
    }
  } else {
    console.warn('No difficulty found in problem data');
  }
  
  // Log additional problem data for debugging
  if (problemData) {
    console.log('Problem data details:', {
      hasTitle: !!problemData.title,
      hasDifficulty: !!problemData.difficulty,
      exampleCount: problemData.examples ? problemData.examples.length : 0,
      constraintCount: problemData.constraints ? problemData.constraints.length : 0,
      hasCode: !!(problemData.code && problemData.code.trim() !== '')
    });
  }
}

// Handle the Go button click
async function handleGoClick() {
  const difficulty = getRadioValue(difficultyRadios) || problemData.difficulty?.toLowerCase() || '';
  const answerType = getRadioValue(answerTypeRadios) || 'code';
  const languageCode = getRadioValue(languageRadios) || 'en';
  const explanationLanguage = languageCode === 'hi' ? 'Hinglish' : 'English';

  if (!difficulty) {
    showError('Please select a difficulty level');
    return;
  }

  loadingElement.classList.remove('hidden');
  resultsElement.classList.add('hidden');

  console.log('Current problemData:', problemData);
  
  try {
    // Get the current tab's code if available
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let userCode = '';
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getCodeAndExamples'
      });
      userCode = response?.code || '';
    } catch (e) {
      console.warn("Could not get user code:", e);
    }

    // Get session token from cookies
    let sessionToken = '';
    try {
      const cookie = await new Promise((resolve) => {
        chrome.cookies.get({
          url: 'http://localhost:3000',
          name: '__session'
        }, (cookie) => {
          resolve(cookie);
        });
      });
      
      if (cookie) {
        sessionToken = cookie.value;
        console.log('Found session token');
      } else {
        console.warn('No session cookie found');
      }
    } catch (error) {
      console.error('Error getting session cookie:', error);
    }

    if (!sessionToken) {
      throw new Error('Please sign in to Lextro at http://localhost:3000 first');
    }

    // Prepare the payload
    const payload = {
      problemTitle: problemData.title,
      difficulty: difficulty || problemData.difficulty?.toLowerCase() || 'medium',
      language: languageCode,
      explanationType: answerType || 'explanation',
      explanationLanguage: explanationLanguage,
      userCode,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    console.log('Sending to backend:', payload);

    // Make the API request
    const res = await fetch("http://localhost:3000/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    console.log("Backend response:", result);

    loadingElement.classList.add('hidden');

    // Debug log the full response
    console.log('Full API response:', JSON.stringify(result, null, 2));
    
    // Extract the query data from the response
    const queryData = result.query || result;
    
    // Format the response with markdown support
    solutionContent.innerHTML = `
      <div class="solution-section">
        <h4>${queryData.problemTitle || 'AI Solution'}</h4>
        <div class="solution-meta">
          <span class="difficulty ${queryData.difficulty?.toLowerCase() || 'medium'}">
            ${queryData.difficulty || 'Unknown'}
          </span>
          ${queryData.language ? `<span class="language">${queryData.language.toUpperCase()}</span>` : ''}
        </div>
        ${queryData.explanation ? 
          `<div class="solution-content">${formatMarkdown(queryData.explanation)}</div>` : 
          '<p>No explanation generated. Please check the console for details.</p>'
        }
        ${queryData.code ? 
          `<pre><code class="language-${(queryData.language || 'javascript').toLowerCase()}">
            ${escapeHtml(queryData.code)}
          </code></pre>` : ''
        }
      </div>
    `;
    
    resultsElement.classList.remove('hidden');
    resultsElement.scrollIntoView({ behavior: 'smooth' });

    // Apply syntax highlighting if available
    if (window.hljs) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    showError(`Failed to process your request: ${error.message || 'Unknown error'}`);
    loadingElement.classList.add('hidden');
  }
}


// Utility function to escape HTML
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Simple markdown formatter (you might want to use a library like marked.js for production)
function formatMarkdown(text) {
  if (!text) return '';
  
  // Basic markdown formatting
  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '<br><br>')
    // Lists
    .replace(/^\s*\* (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
}

// Simulate API call (replace with actual API call to your backend)
function simulateApiCall(data) {
  // This is a simulation - replace with actual API call
  setTimeout(() => {
    // Hide loading
    loadingElement.classList.add('hidden');
    
    // Show results with sample data
    solutionContent.innerHTML = `
      <div class="solution-section">
        <h4>Approach</h4>
        <p>This is a sample solution approach for the problem: <strong>${data.title}</strong>.</p>
        <p>Selected options: ${data.userSelections.answerType} in ${data.userSelections.language === 'en' ? 'English' : 'Hinglish'}</p>
      </div>
      <div class="solution-section">
        <h4>Solution Code</h4>
        <pre><code>// Sample code solution will appear here</code></pre>
      </div>
    `;
    
    // Show results
    resultsElement.classList.remove('hidden');
    
    // Scroll to results
    resultsElement.scrollIntoView({ behavior: 'smooth' });
  }, 2000);
}

// Handle copy to clipboard
function handleCopyClick() {
  const textToCopy = solutionContent.innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    // Show copied feedback
    const originalText = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      copyButton.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

// Show error message
function showError(message) {
  solutionContent.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
    </div>
  `;
  resultsElement.classList.remove('hidden');
}

// Track active requests
const activeRequests = new Set();

// Function to display query data in the UI
function displayQueryData(queryData) {
  if (!queryData) {
    showError('No query data to display');
    return;
  }

  // Update the solution content with the query data
  solutionContent.innerHTML = `
    <div class="solution-section">
      <h4>${queryData.problemTitle || 'Query Details'}</h4>
      <div class="query-meta">
        <span class="difficulty ${queryData.difficulty?.toLowerCase() || 'medium'}">
          ${queryData.difficulty || 'Unknown'}
        </span>
        <span class="language">
          ${queryData.language ? queryData.language.toUpperCase() : ''}
        </span>
      </div>
      
      ${queryData.explanation ? 
        `<div class="solution-content">${formatMarkdown(queryData.explanation)}</div>` : 
        '<p>No explanation available.</p>'
      }
      
      ${queryData.code ? 
        `<pre><code class="language-${queryData.language?.toLowerCase() || 'javascript'}">
          ${escapeHtml(queryData.code)}
        </code></pre>` : ''
      }
      
      <div class="query-footer">
        <small>${new Date(queryData.createdAt).toLocaleString() || ''}</small>
      </div>
    </div>
  `;
  
  // Show the results section
  resultsElement.classList.remove('hidden');
  loadingElement.classList.add('hidden');
  
  // Apply syntax highlighting if available
  if (window.hljs) {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  }
}

// Fetch query data by ID
async function fetchQueryData(queryId) {
  try {
    if (!queryId) {
      throw new Error('No query ID provided');
    }
    
    console.log(`[DEBUG] Fetching query data for ID: ${queryId}`);
    
    // Get the session token from cookies
    const cookies = await chrome.cookies.getAll({ url: 'http://localhost:3000' });
    console.log('[DEBUG] Available cookies:', cookies);
    
    const sessionCookie = cookies.find(cookie => 
      cookie.name === 'next-auth.session-token' || 
      cookie.name === '__Secure-next-auth.session-token'
    );
    
    if (!sessionCookie) {
      throw new Error('Not authenticated. Please sign in to Lextro at http://localhost:3000 first.');
    }
    
    console.log('[DEBUG] Found session cookie');
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Requested-With': 'LeetAssistant',
      'Authorization': `Bearer ${sessionCookie.value}`
    });
    
    const url = new URL('http://localhost:3000/api/query');
    url.searchParams.append('id', queryId);
    
    console.log(`[DEBUG] Making request to: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
      credentials: 'include',
      mode: 'cors'
    });
    
    console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.warn('Could not parse error response:', e);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('[DEBUG] Successfully fetched query data:', data);
    return data;
    
  } catch (error) {
    console.error('[ERROR] Failed to fetch query data:', error);
    showError(`Failed to fetch query: ${error.message}`);
    throw error;
  }
}

// Function to get all queries for the current user
async function fetchUserQueries() {
  try {
    console.log('Fetching user queries');
    
    // Get the session token from cookies
    const cookies = await chrome.cookies.getAll({ url: 'http://localhost:3000' });
    const sessionCookie = cookies.find(cookie => cookie.name === 'next-auth.session-token');
    
    if (!sessionCookie) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'LeetAssistant',
      'Authorization': `Bearer ${sessionCookie.value}`
    };
    
    const response = await fetch('http://localhost:3000/api/query', {
      method: 'GET',
      headers: headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched user queries:', data);
    return data;
    
  } catch (error) {
    console.error('Error fetching user queries:', error);
    showError(`Failed to fetch queries: ${error.message}`);
    throw error;
  }
}

// Handle messages from the content script
window.addEventListener('message', (event) => {
  // Only accept messages from our content script
  if (event.source !== window.parent) return;
  
  try {
    const { action, data, requestId } = event.data || {};
    
    if (action === 'problemData') {
      console.log('Received problem data from content script:', data);
      
      // Mark this request as handled
      if (requestId) {
        activeRequests.delete(requestId);
      }
      
      // Clear any pending timeout
      if (window.requestTimeout) {
        clearTimeout(window.requestTimeout);
        window.requestTimeout = null;
      }
      
      // Reset retry count on successful data receipt
      retryCount = 0;
      window.isRequestingData = false;
      
      if (!data || Object.keys(data).length === 0) {
        console.warn('Received empty problem data');
        return;
      }
      
      // Extract title from URL if not provided
      const getTitleFromUrl = (url) => {
        if (!url) return 'Untitled Problem';
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          const problemSlug = pathParts[pathParts.length - 1];
          if (!problemSlug) return 'Untitled Problem';
          
          // Convert kebab-case to Title Case
          return problemSlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } catch (e) {
          console.warn('Could not extract title from URL:', e);
          return 'Untitled Problem';
        }
      };
      
      // Update problem data and UI
      problemData = { 
        ...problemData, 
        ...data,
        // Add default values if not provided
        title: data.title || getTitleFromUrl(data.url || window.location.href),
        difficulty: data.difficulty || 'Medium',
        description: data.description || '',
        examples: data.examples || [],
        constraints: data.constraints || []
      };
      
      console.log('Updated problemData with title:', problemData.title);
      
      updateProblemInfo();
    }
  } catch (error) {
    console.error('Error handling message:', error);
    window.isRequestingData = false;
  }
});

// Request the latest problem data when the side panel loads
async function requestProblemData() {
  // Don't make multiple simultaneous requests or exceed max retries
  if (window.isRequestingData) {
    console.log('Skipping duplicate data request - already in progress');
    return;
  }
  
  if (retryCount >= MAX_RETRIES) {
    console.warn('Max retries reached, giving up on data request');
    showError('Failed to load problem data. Please refresh the page.');
    return;
  }
  
  console.log(`Requesting problem data (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
  window.isRequestingData = true;
  retryCount++;
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      throw new Error('No active tab found');
    }
    
    // First check authentication
    const authResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'checkAuth' }, resolve);
    });
    
    if (!authResponse?.authenticated) {
      throw new Error('Please sign in to Lextro at http://localhost:3000 first');
    }
    
    // Then get problem data from content script
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tab.id, 
        { 
          action: 'getProblemData',
          requestId: Date.now()
        },
        (response) => {
          // Handle potential Chrome extension message port closed error
          if (chrome.runtime.lastError) {
            console.warn('Message port error:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { error: 'No response from content script' });
          }
        }
      );
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (response.data) {
      console.log('Received problem data:', response.data);
      problemData = response.data;
      updateProblemInfo();
      window.isRequestingData = false;
      retryCount = 0; // Reset retry count on success
      return;
    }
    
    throw new Error('Invalid response format from content script');
    
  } catch (error) {
    console.error('Error in requestProblemData:', error);
    window.isRequestingData = false;
    
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Max 8s delay
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return requestProblemData();
    }
    
    showError(`Failed to load problem data: ${error.message}. Please refresh the page.`);
  }
}
