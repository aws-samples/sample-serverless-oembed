/**
 * AWS X-Ray tracing utilities module
 *
 * This module provides X-Ray tracing capabilities for request flow analysis
 * and performance monitoring. It integrates with the structured logging system
 * to provide comprehensive observability.
 *
 * @module utils/xray
 */

import { logXRayTrace, logError } from "./logger.mjs";

// Dynamically import X-Ray SDK with error handling for test environments
let AWSXRay = null;
try {
  const xrayModule = await import("aws-xray-sdk-core");
  AWSXRay = xrayModule.default;
} catch (error) {
  // X-Ray SDK not available (likely in test environment)
  console.warn("AWS X-Ray SDK not available, tracing will be disabled");
}

/**
 * Creates a new X-Ray subsegment for operation tracking
 * @param {string} name - Subsegment name
 * @param {Function} operation - Async operation to trace
 * @param {Object} metadata - Additional metadata to attach
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<any>} Operation result
 */
export async function traceOperation(
  name,
  operation,
  metadata = {},
  correlationId = null
) {
  // Check if X-Ray is available and has an active segment
  if (!AWSXRay || !AWSXRay.getSegment || !AWSXRay.getSegment()) {
    // If no X-Ray segment is available, just execute the operation
    return await operation();
  }

  const subsegment = AWSXRay.getSegment().addNewSubsegment(name);

  try {
    // Add metadata to the subsegment
    subsegment.addMetadata("operation", {
      name,
      correlationId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    // Log the trace start
    logXRayTrace(
      name,
      subsegment.trace_id,
      {
        subsegmentId: subsegment.id,
        startTime: Date.now(),
        ...metadata,
      },
      correlationId
    );

    // Execute the operation
    const result = await operation();

    // Mark as successful
    subsegment.addAnnotation("success", true);

    return result;
  } catch (error) {
    // Mark as failed and add error information
    subsegment.addAnnotation("success", false);
    subsegment.addAnnotation("error", error.message);

    // Add error details to metadata
    subsegment.addMetadata("error", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    logError(
      "XRAY_TRACE_ERROR",
      `X-Ray traced operation ${name} failed`,
      error,
      correlationId
    );

    throw error;
  } finally {
    // Close the subsegment
    subsegment.close();
  }
}

/**
 * Traces backend integration calls
 * @param {string} url - Content URL being processed
 * @param {Function} operation - Backend operation to trace
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<any>} Operation result
 */
export async function traceBackendIntegration(
  url,
  operation,
  correlationId = null
) {
  return await traceOperation(
    "backend_integration",
    operation,
    {
      url,
      domain: extractDomain(url),
    },
    correlationId
  );
}

/**
 * Traces oEmbed response construction
 * @param {string} contentType - Content type being processed
 * @param {Function} operation - Response construction operation
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<any>} Operation result
 */
export async function traceResponseConstruction(
  contentType,
  operation,
  correlationId = null
) {
  return await traceOperation(
    "response_construction",
    operation,
    {
      contentType,
    },
    correlationId
  );
}

/**
 * Traces validation operations
 * @param {string} validationType - Type of validation (params, url, domain)
 * @param {Function} operation - Validation operation
 * @param {Object} context - Validation context
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<any>} Operation result
 */
export async function traceValidation(
  validationType,
  operation,
  context = {},
  correlationId = null
) {
  return await traceOperation(
    `validation_${validationType}`,
    operation,
    context,
    correlationId
  );
}

/**
 * Adds custom annotations to the current X-Ray segment
 * @param {Object} annotations - Key-value pairs to add as annotations
 */
export function addXRayAnnotations(annotations) {
  try {
    if (!AWSXRay || !AWSXRay.getSegment) return;

    const segment = AWSXRay.getSegment();
    if (segment) {
      Object.entries(annotations).forEach(([key, value]) => {
        segment.addAnnotation(key, value);
      });
    }
  } catch (error) {
    // Silently ignore X-Ray errors to avoid breaking the main flow
    console.warn("Failed to add X-Ray annotations:", error.message);
  }
}

/**
 * Adds custom metadata to the current X-Ray segment
 * @param {string} namespace - Metadata namespace
 * @param {Object} metadata - Metadata object to add
 */
export function addXRayMetadata(namespace, metadata) {
  try {
    if (!AWSXRay || !AWSXRay.getSegment) return;

    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addMetadata(namespace, metadata);
    }
  } catch (error) {
    // Silently ignore X-Ray errors to avoid breaking the main flow
    console.warn("Failed to add X-Ray metadata:", error.message);
  }
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
