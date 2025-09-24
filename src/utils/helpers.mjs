/**
 * Common utility functions module
 *
 * This module provides common utility functions for string manipulation,
 * data transformation, validation helpers, and other shared functionality
 * used throughout the application.
 *
 * @module utils/helpers
 */

/**
 * Escapes XML special characters for safe XML output
 * @param {string} unsafe - String that may contain XML special characters
 * @returns {string} XML-safe string with escaped characters
 */
export function escapeXml(unsafe) {
  if (!unsafe) return "";

  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escapes HTML special characters for safe HTML output
 * @param {string} unsafe - String that may contain HTML special characters
 * @returns {string} HTML-safe string with escaped characters
 */
export function escapeHtml(unsafe) {
  if (!unsafe) return "";

  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validates if a string is a valid URL
 * @param {string} url - URL string to validate
 * @returns {boolean} True if valid URL, false otherwise
 */
export function isValidUrl(url) {
  if (!url || typeof url !== "string") return false;

  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates if a value is a positive integer within range
 * @param {any} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if valid integer in range, false otherwise
 */
export function isValidInteger(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const num = parseInt(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Safely parses an integer with fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed integer or fallback value
 */
export function safeParseInt(value, fallback = 0) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Truncates a string to specified length with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength, suffix = "...") {
  if (!str || typeof str !== "string") return "";
  if (str.length <= maxLength) return str;

  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes empty or null values from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} Object with empty values removed
 */
export function removeEmptyValues(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== "") {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Deep clones an object
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Merges multiple objects with deep merge capability
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects to merge
 * @returns {Object} Merged object
 */
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Checks if a value is a plain object
 * @param {any} item - Item to check
 * @returns {boolean} True if plain object, false otherwise
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Generates a random string of specified length
 * @param {number} length - Length of random string
 * @param {string} charset - Character set to use (default: alphanumeric)
 * @returns {string} Random string
 */
export function generateRandomString(
  length = 8,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Formats a timestamp to ISO string
 * @param {Date|number|string} timestamp - Timestamp to format
 * @returns {string} ISO formatted timestamp
 */
export function formatTimestamp(timestamp = new Date()) {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  if (typeof timestamp === "number") {
    return new Date(timestamp).toISOString();
  }

  if (typeof timestamp === "string") {
    return new Date(timestamp).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Calculates aspect ratio from width and height
 * @param {number} width - Width value
 * @param {number} height - Height value
 * @returns {number} Aspect ratio (width/height)
 */
export function calculateAspectRatio(width, height) {
  if (!width || !height || width <= 0 || height <= 0) {
    return 16 / 9; // Default to 16:9
  }

  return width / height;
}

/**
 * Calculates dimensions maintaining aspect ratio
 * @param {number} originalWidth - Original width
 * @param {number} originalHeight - Original height
 * @param {number} maxWidth - Maximum width constraint
 * @param {number} maxHeight - Maximum height constraint
 * @returns {Object} Calculated dimensions {width, height}
 */
export function calculateConstrainedDimensions(
  originalWidth,
  originalHeight,
  maxWidth,
  maxHeight
) {
  if (!originalWidth || !originalHeight) {
    return {
      width: maxWidth || 640,
      height: maxHeight || 360,
    };
  }

  let width = originalWidth;
  let height = originalHeight;

  // Apply width constraint
  if (maxWidth && width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  // Apply height constraint
  if (maxHeight && height > maxHeight) {
    const ratio = maxHeight / height;
    height = maxHeight;
    width = Math.round(width * ratio);
  }

  return { width, height };
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
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
 * Generates a simple hash from a string using a basic hash algorithm
 * This is used for cache key generation and doesn't need cryptographic security
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
export function generateHash(str) {
  if (!str || typeof str !== "string") return "empty";

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

/**
 * Simple retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function call
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2,
    jitter = true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
