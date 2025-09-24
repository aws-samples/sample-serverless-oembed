/**
 * Structured logging utilities module
 *
 * This module provides structured logging capabilities for CloudWatch
 * integration, correlation ID management, and performance metrics tracking.
 * It ensures consistent log formatting and proper log level management.
 *
 * @module utils/logger
 */

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * Current log level from environment
 */
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.INFO;

/**
 * Generates a correlation ID for request tracking
 * @returns {string} Unique correlation ID
 */
export function generateCorrelationId() {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a structured log entry
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} event - Event type identifier
 * @param {string} message - Log message
 * @param {Object} metadata - Additional context data
 * @param {string} correlationId - Request correlation ID
 * @returns {Object} Structured log entry
 */
export function createLogEntry(
  level,
  event,
  message,
  metadata = {},
  correlationId = null
) {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    correlationId: correlationId || generateCorrelationId(),
    metadata: {
      environment: process.env.ENVIRONMENT || "unknown",
      ...metadata,
    },
  };
}

/**
 * Logs an error with full context
 * @param {string} event - Event type identifier
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or additional context
 * @param {string} correlationId - Request correlation ID
 */
export function logError(event, message, error = null, correlationId = null) {
  if (LOG_LEVELS.ERROR > CURRENT_LOG_LEVEL) return;

  const metadata = {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  };

  const logEntry = createLogEntry(
    "ERROR",
    event,
    message,
    metadata,
    correlationId
  );
  console.error(JSON.stringify(logEntry));
}

/**
 * Logs a warning message
 * @param {string} event - Event type identifier
 * @param {string} message - Warning message
 * @param {Object} metadata - Additional context data
 * @param {string} correlationId - Request correlation ID
 */
export function logWarn(event, message, metadata = {}, correlationId = null) {
  if (LOG_LEVELS.WARN > CURRENT_LOG_LEVEL) return;

  const logEntry = createLogEntry(
    "WARN",
    event,
    message,
    metadata,
    correlationId
  );
  console.warn(JSON.stringify(logEntry));
}

/**
 * Logs an informational message
 * @param {string} event - Event type identifier
 * @param {string} message - Info message
 * @param {Object} metadata - Additional context data
 * @param {string} correlationId - Request correlation ID
 */
export function logInfo(event, message, metadata = {}, correlationId = null) {
  if (LOG_LEVELS.INFO > CURRENT_LOG_LEVEL) return;

  const logEntry = createLogEntry(
    "INFO",
    event,
    message,
    metadata,
    correlationId
  );
  console.log(JSON.stringify(logEntry));
}

/**
 * Logs a debug message
 * @param {string} event - Event type identifier
 * @param {string} message - Debug message
 * @param {Object} metadata - Additional context data
 * @param {string} correlationId - Request correlation ID
 */
export function logDebug(event, message, metadata = {}, correlationId = null) {
  if (LOG_LEVELS.DEBUG > CURRENT_LOG_LEVEL) return;

  const logEntry = createLogEntry(
    "DEBUG",
    event,
    message,
    metadata,
    correlationId
  );
  console.log(JSON.stringify(logEntry));
}

/**
 * Logs request start with timing
 * @param {string} url - Request URL
 * @param {Object} params - Request parameters
 * @param {string} correlationId - Request correlation ID
 * @returns {number} Start timestamp for duration calculation
 */
export function logRequestStart(url, params = {}, correlationId = null) {
  const startTime = Date.now();

  logInfo(
    "REQUEST_START",
    "oEmbed request started",
    {
      url,
      params,
      startTime,
    },
    correlationId
  );

  return startTime;
}

/**
 * Logs request completion with duration
 * @param {number} startTime - Request start timestamp
 * @param {number} statusCode - Response status code
 * @param {string} correlationId - Request correlation ID
 */
export function logRequestEnd(startTime, statusCode, correlationId = null) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  logInfo(
    "REQUEST_END",
    "oEmbed request completed",
    {
      statusCode,
      duration,
      endTime,
    },
    correlationId
  );
}

/**
 * Logs validation errors
 * @param {Array} errors - Validation error array
 * @param {string} correlationId - Request correlation ID
 */
export function logValidationErrors(errors, correlationId = null) {
  logWarn(
    "VALIDATION_ERROR",
    "Request validation failed",
    {
      errors,
      errorCount: errors.length,
    },
    correlationId
  );
}

/**
 * Logs content metadata retrieval
 * @param {string} url - Content URL
 * @param {string} contentId - Extracted content ID
 * @param {string} contentType - Inferred content type
 * @param {string} correlationId - Request correlation ID
 */
export function logContentMetadata(
  url,
  contentId,
  contentType,
  correlationId = null
) {
  logDebug(
    "CONTENT_METADATA",
    "Content metadata extracted",
    {
      url,
      contentId,
      contentType,
    },
    correlationId
  );
}

/**
 * Logs performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Operation duration in milliseconds
 * @param {Object} metrics - Additional performance metrics
 * @param {string} correlationId - Request correlation ID
 */
export function logPerformanceMetrics(
  operation,
  duration,
  metrics = {},
  correlationId = null
) {
  logInfo(
    "PERFORMANCE_METRICS",
    `Performance metrics for ${operation}`,
    {
      operation,
      duration,
      ...metrics,
    },
    correlationId
  );
}

/**
 * Logs business metrics for analytics and monitoring
 * @param {string} contentType - oEmbed content type (photo, video, rich, link)
 * @param {string} url - Content URL
 * @param {Object} params - Request parameters (maxwidth, maxheight, format)
 * @param {number} responseSize - Response size in bytes
 * @param {string} correlationId - Request correlation ID
 */
export function logBusinessMetrics(
  contentType,
  url,
  params = {},
  responseSize = 0,
  correlationId = null
) {
  logInfo(
    "BUSINESS_METRICS",
    "oEmbed business metrics",
    {
      contentType,
      domain: extractDomain(url),
      format: params.format || "json",
      hasMaxWidth: !!params.maxwidth,
      hasMaxHeight: !!params.maxheight,
      responseSize,
      timestamp: Date.now(),
    },
    correlationId
  );
}

/**
 * Logs cache performance metrics
 * @param {string} operation - Cache operation (hit, miss, set)
 * @param {string} key - Cache key
 * @param {number} duration - Operation duration
 * @param {string} correlationId - Request correlation ID
 */
export function logCacheMetrics(
  operation,
  key,
  duration = 0,
  correlationId = null
) {
  logDebug(
    "CACHE_METRICS",
    `Cache ${operation}`,
    {
      operation,
      key: hashKey(key), // Hash sensitive data
      duration,
    },
    correlationId
  );
}

/**
 * Logs backend integration performance
 * @param {string} url - Content URL
 * @param {number} duration - Backend call duration
 * @param {boolean} success - Whether the call was successful
 * @param {string} error - Error message if failed
 * @param {string} correlationId - Request correlation ID
 */
export function logBackendIntegration(
  url,
  duration,
  success,
  error = null,
  correlationId = null
) {
  const level = success ? "INFO" : "WARN";
  const event = "BACKEND_INTEGRATION";
  const message = success
    ? "Backend integration successful"
    : "Backend integration failed";

  const metadata = {
    domain: extractDomain(url),
    duration,
    success,
    error,
  };

  if (level === "INFO") {
    logInfo(event, message, metadata, correlationId);
  } else {
    logWarn(event, message, metadata, correlationId);
  }
}

/**
 * Logs security events for monitoring
 * @param {string} event - Security event type
 * @param {string} message - Event message
 * @param {Object} context - Security context (IP, user agent, etc.)
 * @param {string} correlationId - Request correlation ID
 */
export function logSecurityEvent(
  event,
  message,
  context = {},
  correlationId = null
) {
  logWarn(
    `SECURITY_${event.toUpperCase()}`,
    message,
    {
      securityEvent: event,
      ...context,
    },
    correlationId
  );
}

/**
 * Logs X-Ray tracing information
 * @param {string} operation - Operation being traced
 * @param {string} traceId - X-Ray trace ID
 * @param {Object} metadata - Additional trace metadata
 * @param {string} correlationId - Request correlation ID
 */
export function logXRayTrace(
  operation,
  traceId,
  metadata = {},
  correlationId = null
) {
  logDebug(
    "XRAY_TRACE",
    `X-Ray trace for ${operation}`,
    {
      operation,
      traceId,
      ...metadata,
    },
    correlationId
  );
}

/**
 * Helper function to extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Helper function to hash sensitive keys for logging
 * @param {string} key - Key to hash
 * @returns {string} Hashed key
 */
function hashKey(key) {
  // Simple hash for logging purposes (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}
