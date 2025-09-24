/**
 * URL parsing and parameter extraction module
 *
 * This module handles URL parsing, parameter extraction, and content ID
 * identification for oEmbed requests. It provides utilities for extracting
 * meaningful information from URLs that can be used for content retrieval.
 *
 * @module core/parser
 */

/**
 * Parses a URL and extracts relevant components for content identification
 * @param {string} url - The URL to parse
 * @returns {Object} Parsed URL components and extracted identifiers
 */
export function parseContentUrl(url) {
  try {
    const urlObj = new URL(url);

    // Extract path segments
    const pathSegments = urlObj.pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    // Extract query parameters
    const queryParams = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Attempt to extract content ID from various URL patterns
    const contentId = extractContentId(urlObj.pathname, queryParams);

    // Determine content type based on URL patterns
    const contentType = inferContentType(urlObj.pathname, queryParams);

    return {
      success: true,
      url: url,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      pathSegments,
      queryParams,
      contentId,
      contentType,
      protocol: urlObj.protocol,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url: url,
    };
  }
}

/**
 * Extracts content ID from URL path or query parameters
 * @param {string} pathname - URL pathname
 * @param {Object} queryParams - URL query parameters
 * @returns {string|null} Extracted content ID or null if not found
 */
export function extractContentId(pathname, queryParams) {
  // Try query parameter first (e.g., ?id=123, ?v=abc123)
  if (queryParams.id) return queryParams.id;
  if (queryParams.v) return queryParams.v;
  if (queryParams.video) return queryParams.video;
  if (queryParams.content) return queryParams.content;

  // Try path-based extraction
  const pathSegments = pathname
    .split("/")
    .filter((segment) => segment.length > 0);

  // Common patterns: /video/123, /content/abc, /post/456
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];
    const nextSegment = pathSegments[i + 1];

    if (
      ["video", "content", "post", "article", "media", "embed"].includes(
        segment
      )
    ) {
      return nextSegment;
    }
  }

  // Try last segment if it looks like an ID (numeric or alphanumeric)
  const lastSegment = pathSegments[pathSegments.length - 1];
  if (lastSegment && /^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
    return lastSegment;
  }

  return null;
}

/**
 * Infers content type based on URL patterns
 * @param {string} pathname - URL pathname
 * @param {Object} queryParams - URL query parameters
 * @returns {string} Inferred content type (video, photo, rich, link)
 */
export function inferContentType(pathname, queryParams) {
  const path = pathname.toLowerCase();

  // Video patterns
  if (
    path.includes("/video/") ||
    path.includes("/watch/") ||
    path.includes("/embed/") ||
    queryParams.v ||
    queryParams.video
  ) {
    return "video";
  }

  // Photo patterns
  if (
    path.includes("/photo/") ||
    path.includes("/image/") ||
    path.includes("/gallery/") ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
  ) {
    return "photo";
  }

  // Rich content patterns
  if (
    path.includes("/widget/") ||
    path.includes("/interactive/") ||
    path.includes("/app/") ||
    path.includes("/content/")
  ) {
    return "rich";
  }

  // Link patterns (articles, posts, general content)
  if (
    path.includes("/article/") ||
    path.includes("/post/") ||
    path.includes("/blog/") ||
    path.includes("/news/")
  ) {
    return "link";
  }

  // Default to link for general content
  return "link";
}

/**
 * Extracts parameters for content retrieval
 * @param {Object} parsedUrl - Parsed URL object
 * @param {number} maxwidth - Maximum width constraint
 * @param {number} maxheight - Maximum height constraint
 * @returns {Object} Parameters for content metadata retrieval
 */
export function extractContentParams(parsedUrl, maxwidth, maxheight) {
  return {
    contentId: parsedUrl.contentId,
    contentType: parsedUrl.contentType,
    url: parsedUrl.url,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
    queryParams: parsedUrl.queryParams,
    maxwidth,
    maxheight,
    // Additional context that might be useful for content retrieval
    pathSegments: parsedUrl.pathSegments,
    protocol: parsedUrl.protocol,
  };
}
