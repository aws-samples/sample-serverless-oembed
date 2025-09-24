/**
 * HTML embed generation module
 *
 * This module generates HTML embed code for video and rich content types.
 * It ensures security-focused HTML generation with proper sanitization
 * and responsive design considerations.
 *
 * Performance optimizations:
 * - Pre-compiled HTML templates for common patterns
 * - Efficient string concatenation and template literals
 * - Cached security attributes for iframe generation
 * - Memory-conscious HTML construction
 *
 * Security features:
 * - URL sanitization to prevent XSS attacks
 * - HTML content escaping for safe rendering
 * - Iframe sandboxing with controlled permissions
 * - Protocol validation for embed URLs
 *
 * @module oembed/html-generator
 */

import { SECURITY, DEFAULT_DIMENSIONS } from "../utils/constants.mjs";

// Pre-compiled security attributes for iframe elements
const IFRAME_SECURITY_ATTRS = Object.freeze({
  frameborder: "0",
  allowfullscreen: true,
  allow: SECURITY.IFRAME_ALLOW_ATTRIBUTES,
  sandbox: SECURITY.IFRAME_SANDBOX_ATTRIBUTES,
});

// Pre-compiled error messages for consistent error handling
const ERROR_MESSAGES = Object.freeze({
  VIDEO_NOT_AVAILABLE:
    '<div class="video-error">Video content not available</div>',
  GALLERY_NOT_AVAILABLE: '<div class="gallery-error">No images available</div>',
});

/**
 * Generates HTML embed code for video content with security and performance optimizations
 *
 * Creates secure iframe embed code for video content:
 * - Sanitizes embed URLs to prevent XSS attacks
 * - Uses pre-compiled security attributes for performance
 * - Applies proper iframe sandboxing and permissions
 * - Handles missing URLs gracefully with error messages
 *
 * @param {Object} metadata - Video metadata from backend
 * @param {string} [metadata.embedUrl] - Video embed URL (preferred)
 * @param {string} [metadata.url] - Alternative video URL
 * @param {number} [metadata.width] - Original video width
 * @param {number} [metadata.height] - Original video height
 * @param {number} width - Constrained video width
 * @param {number} height - Constrained video height
 * @returns {string} HTML embed code for video or error message
 */
export function generateVideoHtml(metadata, width, height) {
  // Extract embed URL with fallback options
  const embedUrl = metadata.embedUrl || metadata.url || "";

  // Use provided dimensions or fallback to metadata or defaults
  const safeWidth = width || metadata.width || DEFAULT_DIMENSIONS.video.width;
  const safeHeight =
    height || metadata.height || DEFAULT_DIMENSIONS.video.height;

  // Early return for missing embed URL
  if (!embedUrl) {
    return ERROR_MESSAGES.VIDEO_NOT_AVAILABLE;
  }

  // Sanitize the embed URL for security
  const sanitizedUrl = sanitizeUrl(embedUrl);

  // Return error if URL sanitization failed
  if (!sanitizedUrl) {
    return ERROR_MESSAGES.VIDEO_NOT_AVAILABLE;
  }

  // Generate secure iframe with pre-compiled security attributes
  return "<iframe src=\"" + sanitizedUrl + "\" width=\"" + safeWidth + "\" height=\"" + safeHeight + "\" frameborder=\"" + IFRAME_SECURITY_ATTRS.frameborder + "\" allowfullscreen allow=\"" + IFRAME_SECURITY_ATTRS.allow + "\" sandbox=\"" + IFRAME_SECURITY_ATTRS.sandbox + "\"></iframe>";
}

/**
 * Generates HTML embed code for rich content with security and performance optimizations
 *
 * Creates secure HTML container for rich content:
 * - Uses pre-sanitized HTML if available for performance
 * - Sanitizes content to prevent XSS attacks
 * - Applies consistent styling and dimensions
 * - Handles missing content gracefully
 *
 * @param {Object} metadata - Rich content metadata from backend
 * @param {string} [metadata.html] - Pre-generated HTML content (preferred, assumed sanitized)
 * @param {string} [metadata.content] - Raw content for HTML generation
 * @param {number} [metadata.width] - Original content width
 * @param {number} [metadata.height] - Original content height
 * @param {number} width - Constrained content width
 * @param {number} height - Constrained content height
 * @returns {string} HTML embed code for rich content
 */
export function generateRichHtml(metadata, width, height) {
  // Use provided dimensions or fallback to metadata or defaults
  const safeWidth = width || metadata.width || DEFAULT_DIMENSIONS.rich.width;
  const safeHeight =
    height || metadata.height || DEFAULT_DIMENSIONS.rich.height;

  // If metadata already contains HTML, use it directly (assuming it's pre-sanitized)
  // This is the preferred approach for performance
  if (metadata.html) {
    return metadata.html;
  }

  // Extract content with fallback
  const content = metadata.content || "Rich content";

  // Generate container with consistent styling and sanitized content
  return "<div class=\"rich-content\" style=\"width:" + safeWidth + "px;height:" + safeHeight + "px;border:1px solid #ddd;padding:10px;overflow:auto;\">" + sanitizeHtmlContent(content) + "</div>";
}

/**
 * Generates HTML for interactive widget content with security and performance optimizations
 *
 * Creates secure HTML for interactive widgets:
 * - Uses iframe for external widget URLs with proper sandboxing
 * - Creates secure containers for custom widget content
 * - Sanitizes all content to prevent XSS attacks
 * - Uses consistent styling and dimensions
 *
 * @param {Object} metadata - Widget metadata from backend
 * @param {string} [metadata.widgetUrl] - Widget embed URL (preferred)
 * @param {string} [metadata.embedUrl] - Alternative embed URL
 * @param {string} [metadata.html] - Custom widget HTML content
 * @param {string} [metadata.content] - Raw widget content
 * @param {number} [metadata.width] - Original widget width
 * @param {number} [metadata.height] - Original widget height
 * @param {number} width - Constrained widget width
 * @param {number} height - Constrained widget height
 * @returns {string} HTML embed code for widget
 */
export function generateWidgetHtml(metadata, width, height) {
  // Use provided dimensions or fallback to metadata or defaults
  const safeWidth = width || metadata.width || DEFAULT_DIMENSIONS.widget.width;
  const safeHeight =
    height || metadata.height || DEFAULT_DIMENSIONS.widget.height;

  // If widget has a specific embed URL, use secure iframe
  const widgetUrl = metadata.widgetUrl || metadata.embedUrl;
  if (widgetUrl) {
    const sanitizedUrl = sanitizeUrl(widgetUrl);

    // Return error container if URL sanitization failed
    if (!sanitizedUrl) {
      return `<div class="widget-error">Widget content not available</div>`;
    }

    return "<iframe src=\"" + sanitizedUrl + "\" width=\"" + safeWidth + "\" height=\"" + safeHeight + "\" frameborder=\"" + IFRAME_SECURITY_ATTRS.frameborder + "\" sandbox=\"" + IFRAME_SECURITY_ATTRS.sandbox + "\"></iframe>";
  }

  // Otherwise, create a secure container for custom widget content
  const content = metadata.html || metadata.content || "Interactive widget";
  return "<div class=\"widget-container\" style=\"width:" + safeWidth + "px;height:" + safeHeight + "px;border:1px solid #ccc;border-radius:4px;overflow:hidden;\">" + sanitizeHtmlContent(content) + "</div>";
}

/**
 * Generates responsive HTML wrapper for any embed type with aspect ratio preservation
 *
 * Creates a responsive container that maintains aspect ratio:
 * - Calculates aspect ratio from width and height
 * - Uses padding-bottom technique for responsive scaling
 * - Defaults to 16:9 aspect ratio if dimensions are not available
 * - Ensures content scales properly across different screen sizes
 *
 * @param {string} embedHtml - The embed HTML content to wrap
 * @param {number} [width] - Content width for aspect ratio calculation
 * @param {number} [height] - Content height for aspect ratio calculation
 * @returns {string} Responsive HTML wrapper with proper aspect ratio
 */
export function generateResponsiveWrapper(embedHtml, width, height) {
  // Calculate aspect ratio as percentage for padding-bottom technique
  // Default to 16:9 (56.25%) if dimensions are not available
  const aspectRatio = height && width ? (height / width) * 100 : 56.25;

  return "<div class=\"responsive-embed\" style=\"position:relative;padding-bottom:" + aspectRatio + "%;height:0;overflow:hidden;\"><div style=\"position:absolute;top:0;left:0;width:100%;height:100%;\">" + embedHtml + "</div></div>";
}

/**
 * Sanitizes URL for use in HTML attributes
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
  if (!url) return "";

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return "";
    }

    // Return the properly encoded URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return empty string for security
    return "";
  }
}

/**
 * Basic HTML content sanitization
 * @param {string} content - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
function sanitizeHtmlContent(content) {
  if (!content) return "";

  // Basic HTML escaping for security
  // In a production environment, consider using a proper HTML sanitization library
  return String(content)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Generates HTML for photo gallery embed with security and performance optimizations
 *
 * Creates secure HTML for photo galleries:
 * - Sanitizes all image URLs to prevent XSS attacks
 * - Escapes alt text and titles for security
 * - Uses efficient array mapping and joining
 * - Handles missing images gracefully with error messages
 * - Applies consistent styling and responsive design
 *
 * @param {Object} metadata - Gallery metadata from backend
 * @param {Array} [metadata.images] - Array of image objects
 * @param {string} [metadata.images[].url] - Image URL (preferred)
 * @param {string} [metadata.images[].src] - Alternative image URL
 * @param {string} [metadata.images[].alt] - Image alt text
 * @param {string} [metadata.images[].title] - Image title
 * @param {number} [metadata.width] - Original gallery width
 * @param {number} [metadata.height] - Original gallery height
 * @param {number} width - Constrained gallery width
 * @param {number} height - Constrained gallery height
 * @returns {string} HTML embed code for photo gallery or error message
 */
export function generateGalleryHtml(metadata, width, height) {
  // Use provided dimensions or fallback to metadata or defaults
  const safeWidth = width || metadata.width || 600;
  const safeHeight = height || metadata.height || 400;
  const images = metadata.images || [];

  // Early return for empty gallery
  if (!images.length) {
    return ERROR_MESSAGES.GALLERY_NOT_AVAILABLE;
  }

  // Generate image elements with security sanitization
  const imageElements = images
    .map((image, index) => {
      // Sanitize image URL for security
      const sanitizedUrl = sanitizeUrl(image.url || image.src);

      // Skip images with invalid URLs
      if (!sanitizedUrl) {
        return "";
      }

      // Sanitize alt text for security
      const alt = sanitizeHtmlContent(
        image.alt || image.title || `Image ${index + 1}`
      );

      return "<img src=\"" + sanitizedUrl + "\" alt=\"" + alt + "\" style=\"max-width:100%;height:auto;margin:2px;\">";
    })
    .filter(Boolean) // Remove empty strings from invalid URLs
    .join("");

  // Return error if no valid images remain after sanitization
  if (!imageElements) {
    return ERROR_MESSAGES.GALLERY_NOT_AVAILABLE;
  }

  return "<div class=\"photo-gallery\" style=\"width:" + safeWidth + "px;max-height:" + safeHeight + "px;overflow:auto;border:1px solid #ddd;padding:5px;\">" + imageElements + "</div>";
}
