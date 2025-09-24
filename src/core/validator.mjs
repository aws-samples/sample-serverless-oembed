/**
 * Request validation and sanitization module
 *
 * This module handles all input validation, parameter sanitization,
 * and domain authorization for oEmbed requests. It ensures that
 * incoming requests meet the oEmbed specification requirements
 * and security standards.
 *
 * Performance optimizations:
 * - Pre-compiled validation constants for faster lookups
 * - Early returns to minimize processing overhead
 * - Efficient integer parsing with bounds checking
 * - Memory-conscious error object construction
 *
 * @module core/validator
 */

import { OEMBED, ERROR_CODES, ERROR_MESSAGES } from "../utils/constants.mjs";
import { validateAndSanitizeUrl, sanitizeText, validateNumeric } from "../utils/security.mjs";

// Pre-compiled validation constants for performance
const VALID_FORMATS = Object.freeze(OEMBED.FORMATS);
const MIN_DIMENSION = OEMBED.MIN_DIMENSION;
const MAX_WIDTH_LIMIT = OEMBED.MAX_WIDTH_LIMIT;
const MAX_HEIGHT_LIMIT = OEMBED.MAX_HEIGHT_LIMIT;

/**
 * Validates oEmbed request parameters according to oEmbed 1.0 specification
 *
 * Performs comprehensive validation of all oEmbed parameters:
 * - URL parameter presence and basic format validation
 * - Format parameter validation (json/xml only)
 * - Dimension constraints validation (maxwidth/maxheight)
 * - Returns structured error information for debugging
 *
 * @param {Object|null} queryParams - Query string parameters from the request
 * @param {string} [queryParams.url] - Content URL to embed (required)
 * @param {string} [queryParams.format] - Response format (json|xml, default: json)
 * @param {string} [queryParams.maxwidth] - Maximum width constraint (1-2048)
 * @param {string} [queryParams.maxheight] - Maximum height constraint (1-2048)
 * @returns {Object} Validation result object
 * @returns {boolean} returns.isValid - Whether all validations passed
 * @returns {Array<Object>} returns.errors - Array of validation errors
 * @returns {string} returns.format - Validated format parameter
 */
export function validateOembedParams(queryParams) {
  // Initialize error collection for efficient memory usage
  const errors = [];

  // Null safety check for query parameters
  const params = queryParams || {};

  // Phase 1: Required URL parameter validation
  // This is the most critical validation, so we check it first
  if (!params.url) {
    errors.push(
      createValidationError(
        "url",
        ERROR_MESSAGES[ERROR_CODES.MISSING_URL],
        ERROR_CODES.MISSING_URL
      )
    );
  }

  // Phase 2: Format parameter validation
  // Default to 'json' if not specified, as per oEmbed specification
  const format = params.format || OEMBED.DEFAULT_FORMAT;
  if (!VALID_FORMATS.includes(format)) {
    errors.push(
      createValidationError(
        "format",
        ERROR_MESSAGES[ERROR_CODES.INVALID_FORMAT],
        ERROR_CODES.INVALID_FORMAT
      )
    );
  }

  // Phase 3: Dimension constraints validation
  // Validate maxwidth if provided
  if (params.maxwidth !== undefined) {
    const maxwidthError = validateDimension(
      params.maxwidth,
      "maxwidth",
      ERROR_CODES.INVALID_MAXWIDTH
    );
    if (maxwidthError) errors.push(maxwidthError);
  }

  // Validate maxheight if provided
  if (params.maxheight !== undefined) {
    const maxheightError = validateDimension(
      params.maxheight,
      "maxheight",
      ERROR_CODES.INVALID_MAXHEIGHT
    );
    if (maxheightError) errors.push(maxheightError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    format,
  };
}

/**
 * Creates a standardized validation error object
 * @param {string} field - Field name that failed validation
 * @param {string} message - Human-readable error message
 * @param {string} code - Error code for programmatic handling
 * @returns {Object} Validation error object
 */
function createValidationError(field, message, code) {
  return {
    field,
    message,
    code,
  };
}

/**
 * Validates dimension parameters (maxwidth/maxheight)
 * @param {string} value - Dimension value to validate
 * @param {string} fieldName - Field name for error reporting
 * @param {string} errorCode - Error code to use if validation fails
 * @returns {Object|null} Validation error object or null if valid
 */
function validateDimension(value, fieldName, errorCode) {
  const maxLimit = fieldName === "maxwidth" ? MAX_WIDTH_LIMIT : MAX_HEIGHT_LIMIT;
  const validation = validateNumeric(value, MIN_DIMENSION, maxLimit);

  if (!validation.isValid) {
    return createValidationError(
      fieldName,
      ERROR_MESSAGES[errorCode],
      errorCode
    );
  }

  return null;
}

/**
 * Validates and authorizes a URL against the provider domain
 *
 * Performs comprehensive URL validation and domain authorization:
 * - URL format validation using native URL constructor
 * - Provider domain configuration check
 * - Domain authorization against configured provider domain
 * - Returns detailed validation results for error handling
 *
 * Security considerations:
 * - Prevents unauthorized domain access
 * - Validates URL format to prevent malformed URL attacks
 * - Provides detailed error information for debugging
 *
 * @param {string} url - The URL to validate and authorize
 * @returns {Object} Validation result object
 * @returns {boolean} returns.isValid - Whether URL is valid and authorized
 * @returns {string} [returns.error] - Error message if validation failed
 * @returns {string} [returns.code] - Error code for programmatic handling
 * @returns {string} [returns.details] - Additional error details
 * @returns {URL} [returns.urlObj] - Parsed URL object if valid
 * @returns {string} [returns.hostname] - URL hostname if valid
 * @returns {string} [returns.pathname] - URL pathname if valid
 */
export function validateAndAuthorizeUrl(url) {
  // Phase 1: URL format validation using security utility
  const urlValidation = validateAndSanitizeUrl(url);
  if (!urlValidation.isValid) {
    return {
      isValid: false,
      error: ERROR_MESSAGES[ERROR_CODES.MALFORMED_URL],
      code: ERROR_CODES.MALFORMED_URL,
      details: urlValidation.error,
    };
  }

  // Phase 2: Provider domain configuration check
  const providerDomain = process.env.PROVIDER_DOMAIN;
  if (!providerDomain) {
    return {
      isValid: false,
      error: ERROR_MESSAGES[ERROR_CODES.MISSING_PROVIDER_DOMAIN],
      code: ERROR_CODES.MISSING_PROVIDER_DOMAIN,
    };
  }

  // Phase 3: Domain authorization check
  // Use endsWith for subdomain support (e.g., api.example.com matches example.com)
  if (!urlValidation.hostname.endsWith(providerDomain)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED_DOMAIN],
      code: ERROR_CODES.UNAUTHORIZED_DOMAIN,
      details: `URL hostname ${urlValidation.hostname} does not match provider domain ${providerDomain}`,
    };
  }

  // Return successful validation with parsed URL components
  return {
    isValid: true,
    urlObj: new URL(urlValidation.sanitizedUrl),
    hostname: urlValidation.hostname,
    pathname: urlValidation.pathname,
  };
}

/**
 * Sanitizes input parameters by decoding and validating them
 *
 * Performs safe parameter sanitization with RFC 1738 URL decoding:
 * - URL parameter decoding with fallback for malformed encoding
 * - Format parameter normalization with default fallback
 * - Numeric parameter parsing with safe integer conversion
 * - Memory-efficient object construction
 *
 * Security considerations:
 * - Safe URL decoding with error handling
 * - Integer parsing prevents injection attacks
 * - Null values for invalid numeric parameters
 *
 * @param {Object|null} queryParams - Raw query parameters from request
 * @param {string} [queryParams.url] - Content URL (will be URL decoded)
 * @param {string} [queryParams.format] - Response format (json|xml)
 * @param {string} [queryParams.maxwidth] - Maximum width (will be parsed as integer)
 * @param {string} [queryParams.maxheight] - Maximum height (will be parsed as integer)
 * @returns {Object} Sanitized parameters object
 * @returns {string} [returns.url] - Decoded URL parameter
 * @returns {string} returns.format - Validated format parameter (defaults to 'json')
 * @returns {number|null} [returns.maxwidth] - Parsed maxwidth or null if invalid
 * @returns {number|null} [returns.maxheight] - Parsed maxheight or null if invalid
 */
export function sanitizeParams(queryParams) {
  // Initialize sanitized object for efficient memory usage
  const sanitized = {};

  // Null safety check for query parameters
  const params = queryParams || {};

  // Phase 1: URL parameter sanitization with RFC 1738 decoding
  if (params.url) {
    try {
      // Attempt RFC 1738 compliant URL decoding
      sanitized.url = decodeURIComponent(params.url);
    } catch (error) {
      // Fallback to original value if decoding fails (malformed encoding)
      sanitized.url = params.url;
    }
  }

  // Phase 2: Format parameter normalization
  // Default to 'json' as per oEmbed specification
  sanitized.format = params.format || OEMBED.DEFAULT_FORMAT;

  // Phase 3: Numeric parameter sanitization
  // Maxwidth parameter with safe integer parsing
  if (params.maxwidth !== undefined) {
    sanitized.maxwidth = safeParseInteger(params.maxwidth);
  }

  // Maxheight parameter with safe integer parsing
  if (params.maxheight !== undefined) {
    sanitized.maxheight = safeParseInteger(params.maxheight);
  }

  return sanitized;
}

/**
 * Safely parses a parameter as an integer with URL decoding
 * @param {string} value - Parameter value to parse
 * @returns {number|null} Parsed integer or null if invalid
 */
function safeParseInteger(value) {
  try {
    // First decode the parameter in case it's URL encoded
    const decoded = decodeURIComponent(value);
    const parsed = parseInt(decoded, 10);

    // Return parsed value only if it's a valid number
    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    // If decoding fails, try parsing the original value
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
}
