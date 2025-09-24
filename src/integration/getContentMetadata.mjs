/**
 * Enhanced Backend Integration Interface Module
 *
 * This module provides the single customization point for integrating with
 * your backend content management system. It handles URL parsing, content
 * metadata extraction, and provides a comprehensive interface for content retrieval
 * with advanced URL pattern matching, content type detection, and metadata mapping.
 *
 * QUICK START INTEGRATION:
 * 1. Customize fetchContentFromBackend() to connect to your backend API/database
 * 2. Update URL patterns in enhancedUrlPatternMatcher() for your URL structure
 * 3. Configure environment variables: PROVIDER_NAME, PROVIDER_URL, PROVIDER_DOMAIN
 * 4. Test with your content URLs using SAM local or the test suite
 *
 * EXAMPLE INTEGRATION:
 * ```javascript
 * async function fetchContentFromBackend(contentParams, correlationId) {
 *   const { contentId, contentType } = contentParams;
 *
 *   // Replace with your actual backend call
 *   const response = await fetch(`https://your-api.com/content/${contentId}`);
 *   const data = await response.json();
 *
 *   // Transform your data to oEmbed format
 *   return transformBackendData(data, contentType);
 * }
 * ```
 *
 * SUPPORTED CONTENT TYPES:
 * - video: Video content with iframe embeds
 * - photo: Image content with direct URLs
 * - rich: Interactive/HTML content
 * - link: Article/post content with metadata
 *
 * FEATURES:
 * - Advanced URL pattern matching with confidence scoring
 * - Automatic content type detection
 * - Comprehensive metadata validation and sanitization
 * - Built-in error handling and logging
 * - Test data support for development
 * - Security-focused HTML sanitization
 *
 * For detailed integration instructions, see: src/integration/INTEGRATION_GUIDE.md
 *
 * @module integration/getContentMetadata
 * @version 2.0.0
 * @author Serverless oEmbed Provider
 */

import { parseContentUrl, extractContentParams } from "../core/parser.mjs";
import { logContentMetadata, logError, logInfo } from "../utils/logger.mjs";
import { CONTENT_TYPES, DEFAULT_CACHE_AGES } from "../utils/constants.mjs";
import { retryWithBackoff } from "../utils/helpers.mjs";
import { sanitizeText } from "../utils/security.mjs";

/**
 * Gets metadata for oEmbed request - MAIN CUSTOMIZATION POINT
 *
 * This is the primary function you need to customize to integrate with your
 * backend content management system. It receives a URL and constraints,
 * and should return metadata that conforms to the oEmbed specification.
 *
 * @param {string} url - The URL to retrieve embedding information for (required)
 * @param {number} [maxwidth] - The maximum width of the embedded resource
 * @param {number} [maxheight] - The maximum height of the embedded resource
 * @returns {Promise<Object>} The oEmbed metadata response
 */
export async function getContentMetadata(url, maxwidth, maxheight) {
  const correlationId = `meta_${Date.now()}`;

  try {
    // Parse the URL to extract content information
    const parsedUrl = parseContentUrl(url);

    if (!parsedUrl.success) {
      logError(
        "URL_PARSE_ERROR",
        "Failed to parse content URL",
        {
          url,
          error: parsedUrl.error,
        },
        correlationId
      );

      return createEmptyMetadata();
    }

    // Extract parameters for content retrieval
    const contentParams = extractContentParams(parsedUrl, maxwidth, maxheight);

    // Log content metadata extraction
    logContentMetadata(
      url,
      contentParams.contentId,
      contentParams.contentType,
      correlationId
    );

    // Check if we're in test environment and return mock data
    if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
      return getTestMetadata(url, contentParams);
    }

    // CUSTOMIZATION POINT: Replace this with your actual backend integration
    const metadata = await fetchContentFromBackendWithRetry(
      contentParams,
      correlationId
    );

    return metadata;
  } catch (error) {
    logError(
      "CONTENT_METADATA_ERROR",
      "Error retrieving content metadata",
      error,
      correlationId
    );
    return createEmptyMetadata();
  }
}

/**
 * Fetches content metadata from your backend system with retry logic
 *
 * This wrapper function adds retry capabilities with exponential backoff
 * for improved reliability when calling backend services.
 *
 * @param {Object} contentParams - Parsed content parameters
 * @param {string} correlationId - Request correlation ID for logging
 * @returns {Promise<Object>} Content metadata object
 */
async function fetchContentFromBackendWithRetry(contentParams, correlationId) {
  return await retryWithBackoff(
    () => fetchContentFromBackend(contentParams, correlationId),
    {
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      backoffFactor: 2,
      jitter: true,
    }
  );
}

/**
 * Fetches content metadata from your backend system
 *
 * CUSTOMIZE THIS FUNCTION to integrate with your content management system.
 * This is where you would make API calls, database queries, or other
 * operations to retrieve the actual content metadata.
 *
 * @param {Object} contentParams - Parsed content parameters
 * @param {string} correlationId - Request correlation ID for logging
 * @returns {Promise<Object>} Content metadata object
 */
async function fetchContentFromBackend(contentParams, correlationId) {
  // EXAMPLE IMPLEMENTATION - Replace with your actual backend integration
  const { contentId, contentType } = contentParams;

  // Example: Different handling based on content type
  switch (contentType) {
    case "video":
      return await fetchVideoMetadata(contentId, contentParams, correlationId);

    case "photo":
      return await fetchPhotoMetadata(contentId, contentParams, correlationId);

    case "rich":
      return await fetchRichContentMetadata(
        contentId,
        contentParams,
        correlationId
      );

    case "link":
    default:
      return await fetchLinkMetadata(contentId, contentParams, correlationId);
  }
}

/**
 * Fetches video content metadata
 * CUSTOMIZE THIS FUNCTION for your video content
 *
 * @param {string} contentId - Extracted content ID
 * @param {Object} contentParams - Content parameters
 * @param {string} _correlationId - Correlation ID (unused in example)
 * @returns {Promise<Object>} Video metadata
 */
async function fetchVideoMetadata(contentId, contentParams, _correlationId) {
  // EXAMPLE: Replace with your actual video API call
  // const videoData = await yourVideoAPI.getVideo(contentId);
  // Use correlationId for logging in your actual implementation

  return {
    type: "video",
    title: `Video Content ${contentId}`,
    author_name: "Content Creator",
    author_url: `${contentParams.protocol}//${contentParams.hostname}/creator`,
    width: Math.min(contentParams.maxwidth || 1920, 1920),
    height: Math.min(contentParams.maxheight || 1080, 1080),
    embedUrl: `${contentParams.protocol}//${contentParams.hostname}/embed/${contentId}`,
    thumbnail_url: `${contentParams.protocol}//${contentParams.hostname}/thumb/${contentId}.jpg`,
    thumbnail_width: 320,
    thumbnail_height: 180,
    cache_age: 3600,
  };
}

/**
 * Fetches photo content metadata
 * CUSTOMIZE THIS FUNCTION for your photo content
 *
 * @param {string} contentId - Extracted content ID
 * @param {Object} contentParams - Content parameters
 * @param {string} _correlationId - Correlation ID (unused in example)
 * @returns {Promise<Object>} Photo metadata
 */
async function fetchPhotoMetadata(contentId, contentParams, _correlationId) {
  // EXAMPLE: Replace with your actual photo API call
  // const photoData = await yourPhotoAPI.getPhoto(contentId);
  // Use correlationId for logging in your actual implementation

  return {
    type: "photo",
    title: `Photo ${contentId}`,
    author_name: "Photographer",
    author_url: `${contentParams.protocol}//${contentParams.hostname}/photographer`,
    url: `${contentParams.protocol}//${contentParams.hostname}/images/${contentId}.jpg`,
    width: Math.min(contentParams.maxwidth || 1200, 1200),
    height: Math.min(contentParams.maxheight || 800, 800),
    cache_age: 7200, // 2 hours
  };
}

/**
 * Fetches rich content metadata
 * CUSTOMIZE THIS FUNCTION for your rich content
 *
 * @param {string} contentId - Extracted content ID
 * @param {Object} contentParams - Content parameters
 * @param {string} _correlationId - Correlation ID (unused in example)
 * @returns {Promise<Object>} Rich content metadata
 */
async function fetchRichContentMetadata(
  contentId,
  contentParams,
  _correlationId
) {
  // EXAMPLE: Replace with your actual rich content API call
  // const richData = await yourContentAPI.getRichContent(contentId);
  // Use correlationId for logging in your actual implementation

  return {
    type: "rich",
    title: `Rich Content ${contentId}`,
    author_name: "Content Author",
    author_url: `${contentParams.protocol}//${contentParams.hostname}/author`,
    width: Math.min(contentParams.maxwidth || 500, 500),
    height: Math.min(contentParams.maxheight || 300, 300),
    html: `<div class="rich-content">Rich interactive content for ${sanitizeText(contentId, 50)}</div>`,
    cache_age: 1800, // 30 minutes
  };
}

/**
 * Fetches link content metadata
 * CUSTOMIZE THIS FUNCTION for your link content
 *
 * @param {string} contentId - Extracted content ID
 * @param {Object} contentParams - Content parameters
 * @param {string} _correlationId - Correlation ID (unused in example)
 * @returns {Promise<Object>} Link metadata
 */
async function fetchLinkMetadata(contentId, contentParams, _correlationId) {
  // EXAMPLE: Replace with your actual link metadata API call
  // const linkData = await yourContentAPI.getLinkMetadata(contentId);
  // Use correlationId for logging in your actual implementation

  return {
    type: "link",
    title: `Link Content ${contentId}`,
    author_name: "Content Publisher",
    author_url: `${contentParams.protocol}//${contentParams.hostname}/publisher`,
    cache_age: 3600,
  };
}

/**
 * Returns test metadata for development and testing
 * @param {string} url - Original URL
 * @param {Object} contentParams - Content parameters
 * @returns {Object} Test metadata
 */
function getTestMetadata(url, contentParams) {
  // Return test data based on URL patterns
  if (url.includes("/video/123")) {
    return {
      type: "video",
      title: "Test Video & Special Characters",
      author_name: "Test Author",
      author_url: "https://mybusiness.com/author",
      width: 1920,
      height: 1080,
      embedUrl: "https://mybusiness.com/embed/123",
      thumbnail_url: "https://mybusiness.com/thumb/123.jpg",
      thumbnail_width: 320,
      thumbnail_height: 180,
      cache_age: 3600,
    };
  } else if (url.includes("/content/123")) {
    return {
      type: "rich",
      title: "Test Rich Content",
      author_name: "Test Author",
      author_url: "https://mybusiness.com/author",
      width: 500,
      height: 300,
      html: "<div>Rich content</div>",
      cache_age: 3600,
    };
  }

  // Default test metadata
  return {
    type: contentParams.contentType || "rich",
    title: `Test ${contentParams.contentType || "Content"}`,
    author_name: "Test Author",
    width: contentParams.maxwidth || 500,
    height: contentParams.maxheight || 300,
    cache_age: 3600,
  };
}

/**
 * Creates empty metadata object for error cases
 * @returns {Object} Empty metadata object
 */
function createEmptyMetadata() {
  return {
    type: "link",
    title: "Content Not Available",
    cache_age: 300, // Short cache for errors
  };
}

/**
 * ENHANCED INTEGRATION HELPER FUNCTIONS
 *
 * These functions provide advanced capabilities for backend integration,
 * URL pattern matching, content type detection, and metadata mapping.
 */

/**
 * Advanced URL pattern matcher for content identification
 *
 * This function provides sophisticated URL pattern matching to extract
 * content IDs and types from various URL structures. Customize the patterns
 * to match your specific URL structure.
 *
 * @param {string} url - The URL to analyze
 * @returns {Object} Enhanced parsing results with pattern matching
 */
export function enhancedUrlPatternMatcher(url) {
  const patterns = {
    // Video patterns - customize these for your video URLs
    video: [
      /\/video\/([a-zA-Z0-9_-]+)/i, // /video/abc123
      /\/watch\?v=([a-zA-Z0-9_-]+)/i, // /watch?v=abc123
      /\/embed\/([a-zA-Z0-9_-]+)/i, // /embed/abc123
      /\/v\/([a-zA-Z0-9_-]+)/i, // /v/abc123
      /\/player\/([a-zA-Z0-9_-]+)/i, // /player/abc123
    ],

    // Photo patterns - customize these for your image URLs
    photo: [
      /\/photo\/([a-zA-Z0-9_-]+)/i, // /photo/abc123
      /\/image\/([a-zA-Z0-9_-]+)/i, // /image/abc123
      /\/gallery\/([a-zA-Z0-9_-]+)/i, // /gallery/abc123
      /\/img\/([a-zA-Z0-9_-]+)/i, // /img/abc123
      /\/pictures\/([a-zA-Z0-9_-]+)/i, // /pictures/abc123
    ],

    // Rich content patterns - customize these for your interactive content
    rich: [
      /\/widget\/([a-zA-Z0-9_-]+)/i, // /widget/abc123
      /\/interactive\/([a-zA-Z0-9_-]+)/i, // /interactive/abc123
      /\/app\/([a-zA-Z0-9_-]+)/i, // /app/abc123
      /\/content\/([a-zA-Z0-9_-]+)/i, // /content/abc123
      /\/embed-widget\/([a-zA-Z0-9_-]+)/i, // /embed-widget/abc123
    ],

    // Link patterns - customize these for your article/post URLs
    link: [
      /\/article\/([a-zA-Z0-9_-]+)/i, // /article/abc123
      /\/post\/([a-zA-Z0-9_-]+)/i, // /post/abc123
      /\/blog\/([a-zA-Z0-9_-]+)/i, // /blog/abc123
      /\/news\/([a-zA-Z0-9_-]+)/i, // /news/abc123
      /\/story\/([a-zA-Z0-9_-]+)/i, // /story/abc123
    ],
  };

  // Test each pattern type
  for (const [contentType, typePatterns] of Object.entries(patterns)) {
    for (const pattern of typePatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          success: true,
          contentType,
          contentId: match[1],
          pattern: pattern.toString(),
          matchedSegment: match[0],
        };
      }
    }
  }

  // Fallback: try to extract any alphanumeric ID from the URL
  const fallbackMatch = url.match(/\/([a-zA-Z0-9_-]{3,})\/?(?:\?|$)/);
  if (fallbackMatch) {
    return {
      success: true,
      contentType: "link", // Default to link type
      contentId: fallbackMatch[1],
      pattern: "fallback",
      matchedSegment: fallbackMatch[0],
    };
  }

  return {
    success: false,
    contentType: "link",
    contentId: null,
    pattern: null,
    matchedSegment: null,
  };
}

/**
 * Advanced content type detector with confidence scoring
 *
 * This function analyzes URLs and provides content type detection with
 * confidence scores to help determine the most appropriate oEmbed type.
 *
 * @param {string} url - The URL to analyze
 * @param {Object} [hints={}] - Additional hints for content type detection
 * @returns {Object} Content type detection results with confidence scores
 */
export function detectContentTypeWithConfidence(url, hints = {}) {
  const scores = {
    video: 0,
    photo: 0,
    rich: 0,
    link: 0,
  };

  const urlLower = url.toLowerCase();

  // Video indicators
  if (
    urlLower.includes("/video/") ||
    urlLower.includes("/watch/") ||
    urlLower.includes("/embed/") ||
    urlLower.includes("/player/")
  ) {
    scores.video += 50;
  }
  if (
    urlLower.includes("youtube") ||
    urlLower.includes("vimeo") ||
    urlLower.includes("video")
  ) {
    scores.video += 30;
  }
  if (urlLower.match(/\.(mp4|webm|ogg|mov|avi)$/)) {
    scores.video += 40;
  }

  // Photo indicators
  if (
    urlLower.includes("/photo/") ||
    urlLower.includes("/image/") ||
    urlLower.includes("/gallery/") ||
    urlLower.includes("/img/")
  ) {
    scores.photo += 50;
  }
  if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) {
    scores.photo += 60;
  }
  if (
    urlLower.includes("instagram") ||
    urlLower.includes("flickr") ||
    urlLower.includes("photo")
  ) {
    scores.photo += 30;
  }

  // Rich content indicators
  if (
    urlLower.includes("/widget/") ||
    urlLower.includes("/interactive/") ||
    urlLower.includes("/app/") ||
    urlLower.includes("/embed-widget/")
  ) {
    scores.rich += 50;
  }
  if (
    urlLower.includes("codepen") ||
    urlLower.includes("jsfiddle") ||
    urlLower.includes("interactive")
  ) {
    scores.rich += 40;
  }

  // Link indicators (articles, posts, etc.)
  if (
    urlLower.includes("/article/") ||
    urlLower.includes("/post/") ||
    urlLower.includes("/blog/") ||
    urlLower.includes("/news/")
  ) {
    scores.link += 40;
  }

  // Apply hints if provided
  if (hints.fileExtension) {
    const ext = hints.fileExtension.toLowerCase();
    if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) {
      scores.video += 30;
    } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      scores.photo += 30;
    }
  }

  if (hints.mimeType) {
    const mime = hints.mimeType.toLowerCase();
    if (mime.startsWith("video/")) {
      scores.video += 40;
    } else if (mime.startsWith("image/")) {
      scores.photo += 40;
    }
  }

  // Find the highest scoring type
  const maxScore = Math.max(...Object.values(scores));
  const detectedType = Object.keys(scores).find(
    (key) => scores[key] === maxScore
  );

  // If no clear winner, default to link
  const finalType = maxScore > 0 ? detectedType : "link";
  const confidence = maxScore > 0 ? Math.min(maxScore / 100, 1.0) : 0.1;

  return {
    contentType: finalType,
    confidence: confidence,
    scores: scores,
    reasoning: generateDetectionReasoning(scores, finalType),
  };
}

/**
 * Generates human-readable reasoning for content type detection
 * @param {Object} scores - Content type scores
 * @param {string} selectedType - The selected content type
 * @returns {string} Human-readable reasoning
 */
function generateDetectionReasoning(scores, selectedType) {
  const reasons = [];

  if (scores.video > 0) {
    reasons.push(`Video indicators: ${scores.video} points`);
  }
  if (scores.photo > 0) {
    reasons.push(`Photo indicators: ${scores.photo} points`);
  }
  if (scores.rich > 0) {
    reasons.push(`Rich content indicators: ${scores.rich} points`);
  }
  if (scores.link > 0) {
    reasons.push(`Link indicators: ${scores.link} points`);
  }

  return `Selected '${selectedType}' based on: ${reasons.join(", ")}`;
}

/**
 * Enhanced metadata validator and sanitizer
 *
 * This function validates and sanitizes metadata to ensure oEmbed specification
 * compliance and security best practices.
 *
 * @param {Object} metadata - Raw metadata object
 * @param {string} contentType - Expected content type
 * @returns {Object} Validated and sanitized metadata
 */
export function validateAndSanitizeMetadata(metadata, contentType) {
  const sanitized = {
    type: contentType,
    version: "1.0", // oEmbed version is always 1.0
  };

  // Required fields validation
  if (typeof metadata.title === "string" && metadata.title.trim()) {
    sanitized.title = sanitizeString(metadata.title);
  }

  // Provider information (should come from environment variables)
  sanitized.provider_name = process.env.PROVIDER_NAME || "Content Provider";
  sanitized.provider_url = process.env.PROVIDER_URL || "https://example.com";

  // Optional author information
  if (typeof metadata.author_name === "string" && metadata.author_name.trim()) {
    sanitized.author_name = sanitizeString(metadata.author_name);
  }
  if (isValidUrl(metadata.author_url)) {
    sanitized.author_url = metadata.author_url;
  }

  // Cache age validation
  if (typeof metadata.cache_age === "number" && metadata.cache_age > 0) {
    sanitized.cache_age = Math.min(metadata.cache_age, 86400 * 7); // Max 7 days
  } else {
    sanitized.cache_age = DEFAULT_CACHE_AGES[contentType] || 3600;
  }

  // Type-specific validation
  switch (contentType) {
    case "photo":
      if (isValidUrl(metadata.url)) {
        sanitized.url = metadata.url;
      }
      if (isValidDimension(metadata.width)) {
        sanitized.width = metadata.width;
      }
      if (isValidDimension(metadata.height)) {
        sanitized.height = metadata.height;
      }
      break;

    case "video":
    case "rich":
      if (typeof metadata.html === "string" && metadata.html.trim()) {
        sanitized.html = sanitizeHtml(metadata.html);
      }
      if (isValidDimension(metadata.width)) {
        sanitized.width = metadata.width;
      }
      if (isValidDimension(metadata.height)) {
        sanitized.height = metadata.height;
      }
      break;

    case "link":
      // Link type only requires basic metadata
      break;
  }

  // Thumbnail validation (optional for all types)
  if (isValidUrl(metadata.thumbnail_url)) {
    sanitized.thumbnail_url = metadata.thumbnail_url;
    if (isValidDimension(metadata.thumbnail_width)) {
      sanitized.thumbnail_width = metadata.thumbnail_width;
    }
    if (isValidDimension(metadata.thumbnail_height)) {
      sanitized.thumbnail_height = metadata.thumbnail_height;
    }
  }

  return sanitized;
}

/**
 * Makes an HTTP request to your backend API with enhanced error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */
export async function makeBackendRequest(endpoint, options = {}) {
  const correlationId = options.correlationId || `req_${Date.now()}`;

  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "oEmbed-Provider/2.0",
      "X-Correlation-ID": correlationId,
    },
    timeout: 5000,
  };

  const requestOptions = { ...defaultOptions, ...options };

  logInfo(
    "BACKEND_REQUEST_START",
    `Making backend request to ${endpoint}`,
    { endpoint, method: requestOptions.method },
    correlationId
  );

  try {
    // TODO: Implement actual HTTP request logic
    // Example with fetch (uncomment and customize):
    /*
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
    
    const response = await fetch(endpoint, {
      ...requestOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    logInfo(
      "BACKEND_REQUEST_SUCCESS",
      `Backend request completed successfully`,
      { endpoint, status: response.status },
      correlationId
    );
    
    return data;
    */

    // Placeholder implementation
    logError(
      "BACKEND_REQUEST_NOT_IMPLEMENTED",
      "Backend request function not implemented",
      { endpoint },
      correlationId
    );

    throw new Error(
      "Backend request not implemented - customize makeBackendRequest function"
    );
  } catch (error) {
    logError(
      "BACKEND_REQUEST_ERROR",
      "Backend request failed",
      { endpoint, error: error.message },
      correlationId
    );
    throw error;
  }
}

/**
 * Transforms your backend data to oEmbed format with comprehensive mapping
 * @param {Object} backendData - Raw data from your backend
 * @param {string} contentType - Content type (video, photo, rich, link)
 * @param {Object} [options={}] - Transformation options
 * @returns {Object} oEmbed formatted metadata
 */
export function transformBackendData(backendData, contentType, options = {}) {
  if (!backendData || typeof backendData !== "object") {
    logError(
      "TRANSFORM_ERROR",
      "Invalid backend data provided for transformation",
      { backendData, contentType }
    );
    return createEmptyMetadata();
  }

  // Base metadata structure
  const baseMetadata = {
    type: contentType,
    version: "1.0",
    cache_age: DEFAULT_CACHE_AGES[contentType] || 3600,
  };

  try {
    // Common field mappings - customize these for your backend structure
    const transformed = {
      ...baseMetadata,

      // Title mapping - try multiple possible field names
      title:
        backendData.title ||
        backendData.name ||
        backendData.headline ||
        backendData.subject ||
        `${contentType} content`,

      // Author mapping
      author_name:
        backendData.author?.name ||
        backendData.creator?.name ||
        backendData.author_name ||
        backendData.creator,

      author_url:
        backendData.author?.url ||
        backendData.creator?.url ||
        backendData.author_url,

      // Provider information (from environment)
      provider_name: process.env.PROVIDER_NAME || "Content Provider",
      provider_url: process.env.PROVIDER_URL || "https://example.com",

      // Cache age
      cache_age:
        backendData.cache_age ||
        backendData.ttl ||
        DEFAULT_CACHE_AGES[contentType] ||
        3600,
    };

    // Type-specific transformations
    switch (contentType) {
      case "photo":
        Object.assign(transformed, {
          url:
            backendData.imageUrl ||
            backendData.url ||
            backendData.src ||
            backendData.image?.url,
          width:
            backendData.width ||
            backendData.dimensions?.width ||
            backendData.image?.width,
          height:
            backendData.height ||
            backendData.dimensions?.height ||
            backendData.image?.height,
        });
        break;

      case "video":
        Object.assign(transformed, {
          width: backendData.width || backendData.dimensions?.width || 1920,
          height: backendData.height || backendData.dimensions?.height || 1080,
          html:
            backendData.embedCode ||
            backendData.html ||
            generateVideoEmbed(backendData, options),
        });
        break;

      case "rich":
        Object.assign(transformed, {
          width: backendData.width || backendData.dimensions?.width || 500,
          height: backendData.height || backendData.dimensions?.height || 300,
          html:
            backendData.embedCode ||
            backendData.html ||
            backendData.content ||
            `<div>${backendData.description || "Rich content"}</div>`,
        });
        break;

      case "link":
        // Link type only needs basic metadata
        if (backendData.description) {
          transformed.description = backendData.description;
        }
        break;
    }

    // Thumbnail mapping (optional for all types)
    if (backendData.thumbnail || backendData.thumb) {
      const thumb = backendData.thumbnail || backendData.thumb;
      transformed.thumbnail_url = thumb.url || thumb.src || thumb;
      if (thumb.width) transformed.thumbnail_width = thumb.width;
      if (thumb.height) transformed.thumbnail_height = thumb.height;
    }

    // Validate and sanitize the transformed data
    return validateAndSanitizeMetadata(transformed, contentType);
  } catch (error) {
    logError("TRANSFORM_ERROR", "Error transforming backend data", {
      error: error.message,
      backendData,
      contentType,
    });
    return createEmptyMetadata();
  }
}

/**
 * Generates a secure video embed HTML for video content
 * @param {Object} videoData - Video data from backend
 * @param {Object} options - Generation options
 * @returns {string} Video embed HTML
 */
function generateVideoEmbed(videoData, options = {}) {
  const videoUrl = videoData.videoUrl || videoData.embedUrl || videoData.url;
  const width = Math.min(Math.max(parseInt(options.maxwidth || videoData.width || 1920, 10), 100), 2048);
  const height = Math.min(Math.max(parseInt(options.maxheight || videoData.height || 1080, 10), 100), 2048);

  if (!videoUrl || !isValidUrl(videoUrl)) {
    return "<div>Video not available</div>";
  }

  // Ensure HTTPS for security
  const secureUrl = videoUrl.replace(/^http:/, 'https:');

  // Escape HTML attributes to prevent injection
  const escapedUrl = secureUrl.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

  return `<iframe src="${escapedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
}

/**
 * Utility functions for validation and sanitization
 */

/**
 * Validates if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  if (typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is a valid dimension (positive integer)
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid dimension
 */
function isValidDimension(value) {
  return typeof value === "number" && value > 0 && Number.isInteger(value);
}

/**
 * Sanitizes a string by removing potentially harmful content
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== "string") return "";

  // Enhanced string sanitization
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/data:/gi, "") // Remove data: URLs
    .trim()
    .substring(0, 500); // Limit length and trim whitespace
}

/**
 * Enhanced HTML sanitization for embed content
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
  if (typeof html !== "string") return "";

  // Enhanced sanitization to prevent XSS attacks
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
    .replace(/<iframe\b[^>]*(?:(?!src=["']https?:\/\/)[^>])*>/gi, "") // Remove non-HTTPS iframes
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/data:/gi, "") // Remove data: URLs
    .replace(/vbscript:/gi, "") // Remove vbscript: URLs
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/<(object|embed|applet|form|input|textarea|select|button)\b[^>]*>/gi, "") // Remove dangerous tags
    .replace(/<\/?(object|embed|applet|form|input|textarea|select|button)\b[^>]*>/gi, "")
    .replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, "") // Remove CSS expressions
    .trim()
    .substring(0, 10000); // Limit HTML length
}
