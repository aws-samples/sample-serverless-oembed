/**
 * Response formatting module
 *
 * This module handles the formatting of oEmbed responses in both JSON and XML
 * formats according to the oEmbed 1.0 specification. It ensures proper
 * content-type headers, CORS configuration, and character encoding.
 *
 * Performance optimizations:
 * - Pre-compiled response headers for faster object creation
 * - Efficient XML generation with minimal string concatenation
 * - Memory-conscious error response construction
 * - Cached content-type constants for header efficiency
 *
 * Security features:
 * - XML character escaping to prevent injection attacks
 * - CORS headers for controlled cross-origin access
 * - Proper content-type headers for browser security
 *
 * @module core/formatter
 */

import { escapeXml } from "../utils/helpers.mjs";
import { CORS, CACHE_CONTROL } from "../utils/constants.mjs";

// Pre-compiled response headers for performance optimization
const JSON_HEADERS = Object.freeze({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": CORS.ALLOW_ORIGIN,
});

const XML_HEADERS = Object.freeze({
  "Content-Type": "text/xml",
  "Access-Control-Allow-Origin": CORS.ALLOW_ORIGIN,
});

// XML declaration for consistent XML responses
const XML_DECLARATION =
  '<?xml version="1.0" encoding="utf-8" standalone="yes"?>';

/**
 * Formats an oEmbed response in the requested format
 * @param {Object} data - The oEmbed response data
 * @param {string} format - Response format ('json' or 'xml')
 * @returns {Object} Formatted HTTP response
 */
export function formatResponse(data, format = "json") {
  if (format === "xml") {
    return formatXmlResponse(data);
  }

  return formatJsonResponse(data);
}

/**
 * Formats response as JSON with optimized header construction
 *
 * Creates a JSON HTTP response with proper oEmbed formatting:
 * - Uses pre-compiled headers for performance
 * - Applies cache control based on content cache_age
 * - Ensures proper JSON serialization
 *
 * @param {Object} data - The oEmbed response data
 * @param {number} [data.cache_age] - Cache age in seconds (default: 3600)
 * @returns {Object} JSON HTTP response object
 * @returns {number} returns.statusCode - HTTP status code (200)
 * @returns {Object} returns.headers - Response headers with content-type and CORS
 * @returns {string} returns.body - JSON stringified response body
 */
export function formatJsonResponse(data) {
  // Use cache_age from data or default to 1 hour
  const cacheAge = data.cache_age || CACHE_CONTROL.DEFAULT_MAX_AGE;

  return {
    statusCode: 200,
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": `max-age=${cacheAge}`,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Formats response as XML with optimized header construction
 *
 * Creates an XML HTTP response with proper oEmbed formatting:
 * - Uses pre-compiled headers for performance
 * - Applies cache control based on content cache_age
 * - Ensures proper XML structure and encoding
 *
 * @param {Object} data - The oEmbed response data
 * @param {number} [data.cache_age] - Cache age in seconds (default: 3600)
 * @returns {Object} XML HTTP response object
 * @returns {number} returns.statusCode - HTTP status code (200)
 * @returns {Object} returns.headers - Response headers with content-type and CORS
 * @returns {string} returns.body - XML formatted response body
 */
export function formatXmlResponse(data) {
  // Use cache_age from data or default to 1 hour
  const cacheAge = data.cache_age || CACHE_CONTROL.DEFAULT_MAX_AGE;

  const xmlBody = generateXmlBody(data);

  return {
    statusCode: 200,
    headers: {
      ...XML_HEADERS,
      "Cache-Control": `max-age=${cacheAge}`,
    },
    body: xmlBody,
  };
}

/**
 * Generates XML body from oEmbed data with optimized string construction
 *
 * Creates well-formed XML according to oEmbed specification:
 * - Filters out null/undefined values for clean XML
 * - Escapes XML special characters for security
 * - Uses efficient string concatenation
 * - Maintains consistent XML structure
 *
 * @param {Object} data - The oEmbed response data
 * @returns {string} XML formatted string with proper encoding and structure
 */
export function generateXmlBody(data) {
  // Filter and transform data entries to XML elements efficiently
  const xmlElements = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `  <${key}>${escapeXml(String(value))}</${key}>`)
    .join("\n");

  // Use pre-compiled XML declaration for consistency
  return `${XML_DECLARATION}
<oembed>
${xmlElements}
</oembed>`;
}

/**
 * Formats error response in the requested format
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} format - Response format ('json' or 'xml')
 * @param {string} [code] - Error code identifier
 * @param {string} [details] - Additional error details
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(
  statusCode,
  message,
  format = "json",
  code = null,
  details = null
) {
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  const errorData = {
    error: {
      code: code || getErrorCodeFromStatus(statusCode),
      message,
      timestamp,
      requestId,
    },
  };

  if (details) {
    errorData.error.details = details;
  }

  if (format === "xml") {
    return formatXmlErrorResponse(statusCode, errorData);
  }

  return formatJsonErrorResponse(statusCode, errorData);
}

/**
 * Formats JSON error response with optimized header construction
 *
 * Creates a JSON error response with consistent formatting:
 * - Uses pre-compiled headers for performance
 * - Ensures proper JSON serialization of error data
 * - Maintains consistent error response structure
 *
 * @param {number} statusCode - HTTP status code
 * @param {Object} errorData - Error data object
 * @param {Object} errorData.error - Error details object
 * @returns {Object} JSON error response object
 * @returns {number} returns.statusCode - HTTP error status code
 * @returns {Object} returns.headers - Response headers with content-type and CORS
 * @returns {string} returns.body - JSON stringified error data
 */
export function formatJsonErrorResponse(statusCode, errorData) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(errorData),
  };
}

/**
 * Formats XML error response with optimized header construction
 *
 * Creates an XML error response with consistent formatting:
 * - Uses pre-compiled headers for performance
 * - Ensures proper XML structure and character escaping
 * - Maintains consistent error response structure
 * - Uses pre-compiled XML declaration for consistency
 *
 * @param {number} statusCode - HTTP status code
 * @param {Object} errorData - Error data object
 * @param {Object} errorData.error - Error details object
 * @returns {Object} XML error response object
 * @returns {number} returns.statusCode - HTTP error status code
 * @returns {Object} returns.headers - Response headers with content-type and CORS
 * @returns {string} returns.body - XML formatted error response
 */
export function formatXmlErrorResponse(statusCode, errorData) {
  // Build XML error body with proper escaping and structure
  const xmlBody = `${XML_DECLARATION}
<oembed>
  <error>
    <code>${escapeXml(errorData.error.code)}</code>
    <message>${escapeXml(errorData.error.message)}</message>
    <timestamp>${escapeXml(errorData.error.timestamp)}</timestamp>
    <requestId>${escapeXml(errorData.error.requestId)}</requestId>
    ${errorData.error.details
      ? "<details>" + escapeXml(errorData.error.details) + "</details>"
      : ""
    }
  </error>
</oembed>`;

  return {
    statusCode,
    headers: XML_HEADERS,
    body: xmlBody,
  };
}

/**
 * Gets error code from HTTP status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error code identifier
 */
function getErrorCodeFromStatus(statusCode) {
  const statusCodes = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    404: "NOT_FOUND",
    501: "NOT_IMPLEMENTED",
    500: "INTERNAL_SERVER_ERROR",
  };

  return statusCodes[statusCode] || "UNKNOWN_ERROR";
}

/**
 * Generates a unique request ID for error tracking
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
