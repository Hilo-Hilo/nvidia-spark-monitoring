/**
 * User preferences management with cookie and localStorage support
 */

import { setCookie, getCookie, removeCookie } from './cookies';

const isBrowser = typeof window !== 'undefined';

const PREFERENCE_KEYS = {
  TIMEZONE: 'history_timezone',
  NETWORK_UNIT: 'network_unit',
} as const;

export type NetworkUnit = 'MB/s' | 'Mbps';

/**
 * Detect the client's local timezone
 */
function detectLocalTimezone(): string {
  if (!isBrowser) return 'UTC';
  
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'UTC';
  } catch (e) {
    // Fallback to UTC if detection fails
    return 'UTC';
  }
}

/**
 * Get a preference value with cookie and localStorage fallback
 */
function getPreference(key: string, defaultValue: string): string {
  if (!isBrowser) return defaultValue;
  
  // Try cookie first
  let value = getCookie(key);
  
  // Fallback to localStorage
  if (!value) {
    value = localStorage.getItem(key);
    // If found in localStorage but not cookie, sync to cookie
    if (value) {
      setCookie(key, value, 365); // 1 year expiry for preferences
    }
  }
  
  return value || defaultValue;
}

/**
 * Set a preference value in both cookie and localStorage
 */
function setPreference(key: string, value: string): void {
  if (!isBrowser) return;
  
  // Store in cookie (persistent)
  setCookie(key, value, 365); // 1 year expiry
  
  // Also store in localStorage as fallback
  localStorage.setItem(key, value);
}

/**
 * Remove a preference
 */
function removePreference(key: string): void {
  if (!isBrowser) return;
  
  removeCookie(key);
  localStorage.removeItem(key);
}

export const preferences = {
  /**
   * Get timezone preference (default: client's local timezone)
   */
  getTimezone: (): string => {
    // First check for stored preference
    const stored = getPreference(PREFERENCE_KEYS.TIMEZONE, '');
    
    // If no preference is stored, detect and use client's local timezone
    if (!stored) {
      const localTimezone = detectLocalTimezone();
      // Optionally save the detected timezone as preference (but don't force it)
      // This way users can still manually change it
      return localTimezone;
    }
    
    return stored;
  },
  
  /**
   * Set timezone preference
   */
  setTimezone: (timezone: string): void => {
    setPreference(PREFERENCE_KEYS.TIMEZONE, timezone);
  },
  
  /**
   * Get network unit preference (default: MB/s)
   */
  getNetworkUnit: (): NetworkUnit => {
    const value = getPreference(PREFERENCE_KEYS.NETWORK_UNIT, 'MB/s');
    return (value === 'Mbps' || value === 'MB/s') ? value : 'MB/s';
  },
  
  /**
   * Set network unit preference
   */
  setNetworkUnit: (unit: NetworkUnit): void => {
    setPreference(PREFERENCE_KEYS.NETWORK_UNIT, unit);
  },
  
  /**
   * Clear all preferences
   */
  clearAll: (): void => {
    Object.values(PREFERENCE_KEYS).forEach(key => {
      removePreference(key);
    });
  },
};

