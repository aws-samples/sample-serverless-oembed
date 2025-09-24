/**
 * Main oEmbed Lambda handler
 *
 * This is the main entry point for the oEmbed Lambda function. It orchestrates
 * the request processing by coordinating validation, content retrieval, response
 * building, and formatting. The handler focuses on high-level flow control
 * while delegating specific responsibilities to focused modules.
 *
 * Performance optimizations:
 * - Imports are cached at module level for cold start efficiency
 * - Error status mapping is pre-computed and cached
 * - Early returns minimize processing overhead
 * - Memory-efficient object destructuring and reuse
 *
 * @module handlers/oembed
 */

import {
  validateOembedParams,
  validateAndAuthorizeUrl,
  sanitizeParams,
} from "../core/validator.mjs";
import { formatResponse, formatErrorResponse } from "../core/formatter.mjs";
import { createTypeSpecificResponse } from "../oembed/response-builder.mjs";
import { getContentMetadata } from "../integration/getContentMetadata.mjs";
import {
  logRequestStart,
  logRequestEnd,
  logValidationErrors,
  logError,
  logBusinessMetrics,
  logPerformanceMetrics,
  logBackendIntegration,
  generateCorrelationId,
} from "../utils/logger.mjs";
import {
  traceBackendIntegration,
  traceResponseConstruction,
  traceValidation,
  addXRayAnnotations,
  addXRayMetadata,
} from "../utils/xray.mjs";
import { HTTP_STATUS, ERROR_CODES } from "../utils/constants.mjs";

// Pre-computed error status mapping for performance optimization
// This avoids function calls during request processing
const ERROR_STATUS_MAP = Object.freeze({
  [ERROR_CODES.MISSING_URL]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_URL]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.MALFORMED_URL]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_FORMAT]: HTTP_STATUS.NOT_IMPLEMENTED,
  [ERROR_CODES.INVALID_MAXWIDTH]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_MAXHEIGHT]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.UNAUTHORIZED_DOMAIN]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.CONTENT_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.MISSING_PROVIDER_DOMAIN]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
});

/**
 * Main Lambda handler function
 *
 * Processes oEmbed requests with optimized performance characteristics:
 * - Early parameter validation to minimize processing overhead
 * - Efficient error handling with pre-computed status codes
 * - Memory-conscious object handling and reuse
 * - Comprehensive logging for observability
 *
 * @param {Object} event - API Gateway event object containing query parameters
 * @param {Object} event.queryStringParameters - URL query parameters
 * @param {string} event.queryStringParameters.url - Content URL (required)
 * @param {string} [event.queryStringParameters.format] - Response format (json|xml)
 * @param {string} [event.queryStringParameters.maxwidth] - Maximum width constraint
 * @param {string} [event.queryStringParameters.maxheight] - Maximum height constraint
 * @returns {Promise<Object>} HTTP response object with statusCode, headers, and body
 */
export const handler = async (event) => {
  // Generate correlation ID for request tracking across all logs
  const correlationId = generateCorrelationId();

  // Extract query parameters once for efficiency
  const queryParams = event.queryStringParameters || {};

  // Start performance timing and logging
  const startTime = logRequestStart(
    queryParams.url || "unknown",
    queryParams,
    correlationId
  );

  try {
    // Add X-Ray annotations for request tracking
    addXRayAnnotations({
      url: queryParams.url || "unknown",
      format: queryParams.format || "json",
      hasMaxWidth: !!queryParams.maxwidth,
      hasMaxHeight: !!queryParams.maxheight,
    });

    // Phase 1: Input sanitization and validation with X-Ray tracing
    const { sanitized, validation } = await traceValidation(
      "params",
      async () => {
        const sanitized = sanitizeParams(queryParams);
        const validation = validateOembedParams(queryParams);
        return { sanitized, validation };
      },
      { paramCount: Object.keys(queryParams).length },
      correlationId
    );

    // Early return for validation failures to minimize processing
    if (!validation.isValid) {
      logValidationErrors(validation.errors, correlationId);
      const firstError = validation.errors[0];

      // Add X-Ray annotation for validation failure
      addXRayAnnotations({ validationError: firstError.code });

      // Use pre-computed status mapping for performance
      const statusCode =
        ERROR_STATUS_MAP[firstError.code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const response = formatErrorResponse(
        statusCode,
        firstError.message,
        validation.format,
        firstError.code
      );

      logRequestEnd(startTime, statusCode, correlationId);
      return response;
    }

    // Phase 2: URL validation and domain authorization with X-Ray tracing
    const urlValidation = await traceValidation(
      "url",
      async () => validateAndAuthorizeUrl(sanitized.url),
      { url: sanitized.url },
      correlationId
    );

    // Early return for URL validation failures
    if (!urlValidation.isValid) {
      // Add X-Ray annotation for URL validation failure
      addXRayAnnotations({ urlValidationError: urlValidation.code });

      const statusCode =
        ERROR_STATUS_MAP[urlValidation.code] ||
        HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const response = formatErrorResponse(
        statusCode,
        urlValidation.error,
        sanitized.format,
        urlValidation.code,
        urlValidation.details
      );

      logRequestEnd(startTime, statusCode, correlationId);
      return response;
    }

    // Phase 3: Content metadata retrieval with X-Ray tracing and performance tracking
    const metadata = await traceBackendIntegration(
      sanitized.url,
      async () => {
        const backendStartTime = Date.now();
        let backendSuccess = true;
        let backendError = null;

        try {
          const result = await getContentMetadata(
            sanitized.url,
            sanitized.maxwidth,
            sanitized.maxheight
          );
          return result;
        } catch (error) {
          backendSuccess = false;
          backendError = error.message;
          throw error;
        } finally {
          const backendDuration = Date.now() - backendStartTime;
          logBackendIntegration(
            sanitized.url,
            backendDuration,
            backendSuccess,
            backendError,
            correlationId
          );
        }
      },
      correlationId
    );

    // Phase 4: oEmbed response construction with X-Ray tracing and performance tracking
    const oembedResponse = await traceResponseConstruction(
      metadata.type || "unknown",
      async () => {
        const responseStartTime = Date.now();
        const response = await createTypeSpecificResponse(
          metadata,
          sanitized.maxwidth,
          sanitized.maxheight
        );
        const responseDuration = Date.now() - responseStartTime;

        logPerformanceMetrics(
          "response_construction",
          responseDuration,
          {
            contentType: response.type,
            hasHtml: !!response.html,
            hasThumbnail: !!response.thumbnail_url,
          },
          correlationId
        );

        return response;
      },
      correlationId
    );

    // Phase 5: Response formatting and delivery
    const response = formatResponse(oembedResponse, sanitized.format);

    // Add X-Ray annotations for successful request
    addXRayAnnotations({
      success: true,
      contentType: oembedResponse.type,
      responseFormat: sanitized.format,
      responseSize: response.body ? response.body.length : 0,
    });

    // Add X-Ray metadata for detailed analysis
    addXRayMetadata("oembed_response", {
      type: oembedResponse.type,
      hasHtml: !!oembedResponse.html,
      hasThumbnail: !!oembedResponse.thumbnail_url,
      width: oembedResponse.width,
      height: oembedResponse.height,
      title: oembedResponse.title,
      provider: oembedResponse.provider_name,
    });

    // Log business metrics for analytics
    logBusinessMetrics(
      oembedResponse.type,
      sanitized.url,
      {
        format: sanitized.format,
        maxwidth: sanitized.maxwidth,
        maxheight: sanitized.maxheight,
      },
      response.body ? response.body.length : 0,
      correlationId
    );

    logRequestEnd(startTime, HTTP_STATUS.OK, correlationId);
    return response;
  } catch (error) {
    // Add X-Ray annotation for error
    try {
      addXRayAnnotations({
        success: false,
        errorType: error.name || "UnknownError",
        errorMessage: error.message,
      });
    } catch (xrayError) {
      // Silently ignore X-Ray errors to avoid breaking the main flow
      console.warn("Failed to add X-Ray error annotations:", xrayError.message);
    }

    // Comprehensive error handling for any unhandled exceptions
    logError(
      "HANDLER_ERROR",
      "Unhandled error in oEmbed handler",
      error,
      correlationId
    );

    // Fallback error response with safe format detection
    const response = formatErrorResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Internal server error",
      queryParams.format || "json",
      ERROR_CODES.INTERNAL_ERROR
    );

    logRequestEnd(startTime, HTTP_STATUS.INTERNAL_SERVER_ERROR, correlationId);
    return response;
  }
};
