// UI Elements
const authSection = document.getElementById('authSection');
const userSection = document.getElementById('userSection');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const loginBtn = document.getElementById('loginBtn');
const signOutBtn = document.getElementById('signOutBtn');
const startSolvingBtn = document.getElementById('startSolvingBtn');

// Check authentication state
async function checkAuthState() {
  console.log('checkAuthState called');
  try {
    // First check if we have a recent auth check (within last 5 minutes)
    const { lastAuthCheck, userInfo: cachedUserInfo } = await chrome.storage.local.get(['lastAuthCheck', 'userInfo']);
    const now = Date.now();
    
    if (lastAuthCheck && (now - lastAuthCheck < 5 * 60 * 1000) && cachedUserInfo) {
      console.log('Using cached auth state');
      updateUserUI(cachedUserInfo);
      updateUIVisibility(true);
      return;
    }
    
    // Try to fetch fresh user data
    try {
      console.log('Fetching fresh user data...');
      const response = await fetch('http://localhost:3000/api/user', {
        credentials: 'include', // Important for sending cookies
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('API Response Data:', userData);
        
        // Store user info and update last check time
        await chrome.storage.local.set({ 
          userInfo: userData,
          lastAuthCheck: now
        });
        
        console.log('Updating UI with user data:', userData);
        updateUserUI(userData);
        updateUIVisibility(true);
        return;
      }
      
      // If we get here, the request failed (likely 401)
      if (response.status === 401) {
        console.log('Not authenticated, showing auth UI');
        throw new Error('Not authenticated');
      }
      
    } catch (error) {
      console.log('API check failed, falling back to cookie check:', error);
    }
    
    // Fallback to cookie check if API check fails
    console.log('Falling back to cookie check...');
    const cookies = await chrome.cookies.getAll({ domain: 'localhost' });
    console.log('Found cookies:', cookies.map(c => c.name));
    
    const hasValidSession = cookies.some(cookie => 
      (cookie.name.startsWith('__session') || 
       cookie.name.includes('clerk')) &&
      (!cookie.expirationDate || cookie.expirationDate > (Date.now() / 1000)) // Check if cookie is not expired
    );
    
    console.log('Has valid session:', hasValidSession);
    
    if (hasValidSession && cachedUserInfo) {
      // If we have valid cookies but API failed, use cached user info
      console.log('Using cached user info');
      await chrome.storage.local.set({ lastAuthCheck: now });
      updateUserUI(cachedUserInfo);
      updateUIVisibility(true);
    } else {
      // No valid session found
      console.log('No valid session found, showing auth UI');
      await chrome.storage.local.remove(['userInfo', 'lastAuthCheck']);
      updateUIVisibility(false);
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    // On error, try to show cached user data if available
    const { userInfo } = await chrome.storage.local.get('userInfo');
    if (userInfo) {
      updateUserUI(userInfo);
    } else {
      showAuthUI();
    }
  }
}

// Show authentication UI
function showAuthUI() {
  updateUIVisibility(false);
}

// Show user info when logged in
async function showUserInfo(sessionToken) {
  try {
    // Try to get user info from storage first
    const { userInfo } = await chrome.storage.local.get('userInfo');
    
    if (userInfo) {
      updateUserUI(userInfo);
    }
    
    // Fetch fresh user data from the API
    const response = await fetch('http://localhost:3000/api/user', {
      credentials: 'include', // Important for sending cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      // Session expired or invalid
      await chrome.storage.local.remove(['clerkSession', 'userInfo', 'lastAuthCheck']);
      showAuthUI();
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const userData = await response.json();
    
    // Store user info for future use
    await chrome.storage.local.set({ 
      userInfo: userData,
      lastUserFetch: Date.now()
    });
    
    updateUserUI(userData);
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    // If we have stale data, show it, otherwise show auth UI
    const { userInfo } = await chrome.storage.local.get('userInfo');
    if (userInfo) {
      updateUserUI(userInfo);
    } else {
      showAuthUI();
    }
  }
}

// Update UI with user data
function updateUserUI(user) {
  console.log('updateUserUI called with:', user);
  
  // Get first letter of first and last name for avatar
  const initials = user && user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';
    
  console.log('Setting user info in UI:', {
    name: user?.name || 'User',
    email: user?.email || '',
    initials
  });
  
  userName.textContent = user?.name || 'User';
  userEmail.textContent = user?.email || '';
  userAvatar.textContent = initials;
  
  // Show user section and hide auth section
  console.log('Showing user section, hiding auth section');
  authSection.style.display = 'none';
  userSection.style.display = 'block';
  
  // Force a reflow to ensure the UI updates
  void userSection.offsetHeight;
}

// Handle sign out
async function handleSignOut() {
  try {
    // Clear all Clerk-related cookies
    const domains = ['localhost', '.localhost', 'clerk.accounts.dev', '.clerk.accounts.dev'];
    
    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        for (const cookie of cookies) {
          if (cookie.name.includes('clerk') || 
              cookie.name.includes('session') || 
              cookie.name.includes('__session')) {
            await chrome.cookies.remove({
              url: `http${cookie.secure ? 's' : ''}://${domain}${cookie.path || '/'}`,
              name: cookie.name
            });
          }
        }
      } catch (error) {
        console.warn(`Error clearing cookies for ${domain}:`, error);
      }
    }
    
    // Clear all stored data
    await chrome.storage.local.clear();
    
    // Force a hard refresh of the popup to ensure clean state
    window.location.reload();
    
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if there's an error, still try to show auth UI
    showAuthUI();
  }
}

// Handle start solving
function handleStartSolving() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    const isLeetCode = activeTab.url.includes('leetcode.com/problems/');
    
    if (isLeetCode) {
      // If on LeetCode, inject the side panel
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }).then(() => {
        // Send message to show the side panel
        chrome.tabs.sendMessage(activeTab.id, { action: 'showSidePanel' });
        // Close the popup
        window.close();
      }).catch(err => {
        console.error('Failed to inject content script:', err);
      });
    } else {
      // If not on LeetCode, open a new tab with LeetCode problems
      chrome.tabs.create({ url: 'https://leetcode.com/problemset/all/' });
      window.close();
    }
  });
}

// Function to handle visibility of UI elements
function updateUIVisibility(isAuthenticated) {
  console.log('Updating UI visibility. Authenticated:', isAuthenticated);
  if (isAuthenticated) {
    authSection.style.display = 'none';
    userSection.style.display = 'block';
  } else {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
  }
  // Force a reflow to ensure the UI updates
  void userSection.offsetHeight;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded, checking auth state...');
  
  // Add click handlers
  loginBtn?.addEventListener('click', () => {
    console.log('Login button clicked');
    chrome.tabs.create({ 
      url: 'http://localhost:3000/',
      active: true
    });
    // Close the popup after a short delay
    setTimeout(() => window.close(), 300);
  });

  signOutBtn?.addEventListener('click', handleSignOut);
  startSolvingBtn?.addEventListener('click', handleStartSolving);
  
  // Add a refresh button for debugging
  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'refreshBtn';
  refreshBtn.textContent = '🔄 Refresh';
  refreshBtn.addEventListener('click', () => {
    console.log('Manual refresh triggered');
    checkAuthState();
  });
  document.body.appendChild(refreshBtn);
  
  // Add debug info
  const debugInfo = document.createElement('div');
  debugInfo.className = 'debug-info';
  debugInfo.textContent = 'v1.0.0';
  document.body.appendChild(debugInfo);
  
  // Initial auth check
  console.log('Running initial auth check...');
  await checkAuthState();
  
  // Check again after a short delay to catch any async updates
  setTimeout(() => {
    console.log('Running delayed auth check...');
    checkAuthState();
  }, 1000);
  
  // Listen for visibility changes (in case the popup was reopened)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('Popup became visible, checking auth state...');
      checkAuthState();
    }
  });
});

// Check for auth state changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('localhost')) {
    checkAuthState();
  }
});
