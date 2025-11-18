/**
 * Cookie utility functions with localStorage fallback
 * Provides persistent storage that works across browser sessions
 */

const isBrowser = typeof window !== 'undefined';

/**
 * Set a cookie with optional expiration (default: 30 days)
 */
export function setCookie(name: string, value: string, days: number = 30): void {
  if (!isBrowser) return;
  
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    document.cookie = cookie;
    
    // Also store in localStorage as fallback
    localStorage.setItem(`cookie_${name}`, value);
  } catch (e) {
    console.error('Failed to set cookie:', e);
    // Fallback to localStorage only
    localStorage.setItem(`cookie_${name}`, value);
  }
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  
  try {
    // Try to get from cookie first
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = decodeURIComponent(c.substring(nameEQ.length, c.length));
        // Sync to localStorage as backup
        localStorage.setItem(`cookie_${name}`, value);
        return value;
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(`cookie_${name}`);
    if (stored) {
      // Try to restore to cookie
      setCookie(name, stored);
      return stored;
    }
    
    // Also check direct localStorage (for backward compatibility)
    return localStorage.getItem(name);
  } catch (e) {
    console.error('Failed to get cookie:', e);
    // Fallback to localStorage
    return localStorage.getItem(`cookie_${name}`) || localStorage.getItem(name);
  }
}

/**
 * Remove a cookie
 */
export function removeCookie(name: string): void {
  if (!isBrowser) return;
  
  try {
    // Remove cookie
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    
    // Remove from localStorage
    localStorage.removeItem(`cookie_${name}`);
    localStorage.removeItem(name);
  } catch (e) {
    console.error('Failed to remove cookie:', e);
    // Fallback to localStorage only
    localStorage.removeItem(`cookie_${name}`);
    localStorage.removeItem(name);
  }
}

/**
 * Check if cookies are available
 */
export function cookiesAvailable(): boolean {
  if (!isBrowser) return false;
  try {
    document.cookie = 'test=1';
    const available = document.cookie.indexOf('test=') !== -1;
    document.cookie = 'test=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
    return available;
  } catch (e) {
    return false;
  }
}

