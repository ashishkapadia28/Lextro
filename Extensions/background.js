// Background script for handling authentication checks

// Check if user is authenticated by checking for Clerk session cookies
async function checkAuth() {
  try {
    // First check local storage for cached auth state
    const { lastAuthCheck, userInfo } = await chrome.storage.local.get(['lastAuthCheck', 'userInfo']);
    const now = Date.now();
    
    // If we have a recent auth check and user info, use that
    if (lastAuthCheck && (now - lastAuthCheck < 5 * 60 * 1000) && userInfo) {
      console.log('Using cached auth state');
      return { authenticated: true, user: userInfo };
    }
    
    // Otherwise, check cookies
    const cookies = await chrome.cookies.getAll({ domain: 'localhost' });
    const hasValidSession = cookies.some(cookie => 
      (cookie.name.startsWith('__session') || 
       cookie.name.includes('clerk')) &&
      (!cookie.expirationDate || cookie.expirationDate > (Date.now() / 1000))
    );
    
    if (hasValidSession) {
      // If we have valid cookies, try to get fresh user data
      try {
        const response = await fetch('http://localhost:3000/api/user', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const userData = await response.json();
          await chrome.storage.local.set({ 
            userInfo: userData,
            lastAuthCheck: now
          });
          return { authenticated: true, user: userData };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      
      // If we have valid cookies but couldn't fetch user data, use cached data if available
      if (userInfo) {
        return { authenticated: true, user: userInfo };
      }
    }
    
    // No valid session found
    await chrome.storage.local.remove(['userInfo', 'lastAuthCheck']);
    return { authenticated: false };
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false };
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAuth') {
    checkAuth().then(sendResponse);
    return true; // Required to use sendResponse asynchronously
  }
});

// Clear auth state when cookies change
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.cookie.domain.includes('localhost')) {
    // If a session cookie was removed, clear the auth state
    if ((changeInfo.cookie.name.startsWith('__session') || 
         changeInfo.cookie.name.includes('clerk')) && 
        changeInfo.removed) {
      await chrome.storage.local.remove(['userInfo', 'lastAuthCheck']);
    }
  }
});
