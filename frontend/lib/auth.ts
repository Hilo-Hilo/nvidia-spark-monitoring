import { setCookie, getCookie, removeCookie } from './cookies';

const isBrowser = typeof window !== 'undefined';
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

/**
 * Decode JWT token to get payload (without verification)
 * This is safe for client-side expiry checking
 */
function decodeToken(token: string): { exp?: number; sub?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // Check if token expires within the next minute (buffer for clock skew)
  const expiryTime = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  return expiryTime <= now + 60000; // 1 minute buffer
}

export const auth = {
  setToken: (token: string) => {
    if (!isBrowser) return;
    
    // Store in cookie (persistent, sent with requests)
    setCookie(TOKEN_KEY, token, 30); // 30 days
    
    // Also store in localStorage as fallback
    localStorage.setItem(TOKEN_KEY, token);
    
    // Store expiry time for quick checking
    const decoded = decodeToken(token);
    if (decoded?.exp) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, decoded.exp.toString());
    }
  },
  
  getToken: () => {
    if (!isBrowser) return null;
    
    // Try cookie first
    let token = getCookie(TOKEN_KEY);
    
    // Fallback to localStorage
    if (!token) {
      token = localStorage.getItem(TOKEN_KEY);
      // If found in localStorage but not cookie, sync to cookie
      if (token) {
        setCookie(TOKEN_KEY, token, 30);
      }
    }
    
    // Validate token if found
    if (token && isTokenExpired(token)) {
      // Token expired, remove it
      auth.removeToken();
      return null;
    }
    
    return token;
  },
  
  removeToken: () => {
    if (!isBrowser) return;
    
    // Remove from cookie
    removeCookie(TOKEN_KEY);
    
    // Remove from localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
  
  isAuthenticated: () => {
    if (!isBrowser) return false;
    
    const token = auth.getToken();
    if (!token) return false;
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      auth.removeToken();
      return false;
    }
    
    return true;
  },
};

