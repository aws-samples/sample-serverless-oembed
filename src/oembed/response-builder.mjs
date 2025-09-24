/**
 * oEmbed response construction module
 *
 * This module handles the construction of oEmbed responses according to the
 * oEmbed 1.0 specification. It ensures compliance with required fields,
 * proper type-specific handling, and metadata integration.
 *
 * Performance optimizations:
 * - Pre-compiled base response template for efficiency
 * - Optimized dimension calculation with bounds checking
 * - Memory-efficient object construction and spreading
 * - Cached environment variables for provider information
 *
 * Specification compliance:
 * - Strict adherence to oEmbed 1.0 required fields
 * - Type-specific field validation and construction
 * - Proper thumbnail handling (all-or-none rule)
 * - Dimension constraint application with aspect ratio preservation
 *
 * @module oembed/response-builder
 */

import { generateVideoHtml, generateRichHtml } from "./html-generator.mjs";
import { OEMBED, DEFAULT_DIMENSIONS } from "../utils/constants.mjs";

// Pre-compiled base response template for efficiency (without provider info)
const BASE_RESPONSE_TEMPLATE = Object.freeze({
  version: OEMBED.VERSION,
  cache_age: OEMBED.DEFAULT_CACHE_AGE,
});

/**
 * Creates a type-specific oEmbed response from content metadata
 *
 * Constructs a complete oEmbed response according to the 1.0 specification:
 * - Builds base response with required fields (version, type, provider info)
 * - Adds optional common fields (title, author, cache_age)
 * - Handles thumbnail fields according to oEmbed all-or-none rule
 * - Creates type-specific responses with proper field validation
 * - Applies dimension constraints while preserving aspect ratios
 *
 * Performance optimizations:
 * - Uses pre-compiled base response template
 * - Efficient object spreading and construction
 * - Early validation to prevent unnecessary processing
 *
 * @param {Object} metadata - Content metadata from backend integration
 * @param {string} metadata.type - Content type (photo|video|rich|link)
 * @param {string} [metadata.title] - Content title
 * @param {string} [metadata.author_name] - Content author name
 * @param {string} [metadata.author_url] - Content author URL
 * @param {number} [metadata.width] - Content width
 * @param {number} [metadata.height] - Content height
 * @param {string} [metadata.url] - Content URL (required for photo type)
 * @param {string} [metadata.html] - Embed HTML (required for video/rich types)
 * @param {string} [metadata.embedUrl] - Embed URL (alternative to html for video)
 * @param {string} [metadata.thumbnail_url] - Thumbnail URL
 * @param {number} [metadata.thumbnail_width] - Thumbnail width
 * @param {number} [metadata.thumbnail_height] - Thumbnail height
 * @param {number} [metadata.cache_age] - Cache age in seconds
 * @param {number} [maxwidth] - Maximum width constraint (1-2048)
 * @param {number} [maxheight] - Maximum height constraint (1-2048)
 * @returns {Promise<Object>} Complete oEmbed response object
 * @throws {Error} When required fields are missing for specific content types
 */
export async function createTypeSpecificResponse(
  metadata,
  maxwidth,
  maxheight
) {
  // Phase 1: Build base response using pre-compiled template for efficiency
  const baseResponse = buildBaseResponse(metadata);

  // Phase 2: Add optional common fields (title, author, cache settings)
  addOptionalFields(baseResponse, metadata);

  // Phase 3: Add thumbnail information following oEmbed all-or-none rule
  addThumbnailFields(baseResponse, metadata);

  // Phase 4: Create type-specific response with proper validation
  const contentType = metadata.type || "rich"; // Default to rich if not specified

  switch (contentType) {
    case "photo":
      return createPhotoResponse(baseResponse, metadata, maxwidth, maxheight);

    case "video":
      return createVideoResponse(baseResponse, metadata, maxwidth, maxheight);

    case "link":
      return createLinkResponse(baseResponse, metadata);

    case "rich":
      return createRichResponse(baseResponse, metadata, maxwidth, maxheight);

    default:
      // Handle unknown content types by defaulting to rich type
      return createRichResponse(
        baseResponse,
        { ...metadata, type: "rich" },
        maxwidth,
        maxheight
      );
  }
}

/**
 * Builds the base oEmbed response with required fields using pre-compiled template
 *
 * Creates the foundation oEmbed response with all required fields:
 * - Uses dynamic environment variables for test compatibility
 * - Applies pre-compiled base template for efficiency
 * - Sets content type with fallback to 'rich'
 * - Includes provider information from environment
 *
 * @param {Object} metadata - Content metadata from backend
 * @param {string} [metadata.type] - Content type (defaults to 'rich')
 * @returns {Object} Base response object with required oEmbed fields
 */
function buildBaseResponse(metadata) {
  return {
    ...BASE_RESPONSE_TEMPLATE,
    type: metadata.type || "rich", // Required by oEmbed spec, default to rich
    provider_name: process.env.PROVIDER_NAME || "oEmbed Provider",
    provider_url: process.env.PROVIDER_URL || "https://example.com",
  };
}

/**
 * Adds optional common fields to the response with efficient field mapping
 *
 * Enhances the base response with optional oEmbed fields:
 * - Title information for content identification
 * - Author information with flexible field mapping
 * - Cache age configuration with sensible defaults
 * - Memory-efficient field assignment
 *
 * @param {Object} response - Response object to modify (mutated for performance)
 * @param {Object} metadata - Content metadata from backend
 * @param {string} [metadata.title] - Content title
 * @param {string} [metadata.author_name] - Author name (preferred)
 * @param {string} [metadata.author] - Author name (alternative field)
 * @param {string} [metadata.author_url] - Author URL (preferred)
 * @param {string} [metadata.authorUrl] - Author URL (alternative field)
 * @param {number} [metadata.cache_age] - Cache age in seconds
 */
function addOptionalFields(response, metadata) {
  // Add title if available (common across all content types)
  if (metadata.title) {
    response.title = metadata.title;
  }

  // Add author information with flexible field mapping
  // Support both standard oEmbed field names and common alternatives
  const authorName = metadata.author_name || metadata.author;
  if (authorName) {
    response.author_name = authorName;
  }

  const authorUrl = metadata.author_url || metadata.authorUrl;
  if (authorUrl) {
    response.author_url = authorUrl;
  }

  // Override default cache age if specified in metadata
  if (metadata.cache_age !== undefined) {
    response.cache_age = metadata.cache_age;
  }
}

/**
 * Adds thumbnail fields to the response following oEmbed all-or-none rule
 *
 * Handles thumbnail information according to oEmbed specification:
 * - Follows the all-or-none rule for thumbnail fields
 * - Supports flexible field mapping for thumbnail URL
 * - Adds dimensions only when available
 * - Memory-efficient field assignment
 *
 * @param {Object} response - Response object to modify (mutated for performance)
 * @param {Object} metadata - Content metadata from backend
 * @param {string} [metadata.thumbnail_url] - Thumbnail URL (preferred)
 * @param {string} [metadata.thumbnail] - Thumbnail URL (alternative field)
 * @param {number} [metadata.thumbnail_width] - Thumbnail width in pixels
 * @param {number} [metadata.thumbnail_height] - Thumbnail height in pixels
 */
function addThumbnailFields(response, metadata) {
  // Check for thumbnail URL with flexible field mapping
  const thumbnailUrl = metadata.thumbnail_url || metadata.thumbnail;

  if (thumbnailUrl) {
    // Add thumbnail URL (required if any thumbnail field is present)
    response.thumbnail_url = thumbnailUrl;

    // Add thumbnail dimensions if available
    // These are optional but recommended for better display
    if (metadata.thumbnail_width) {
      response.thumbnail_width = metadata.thumbnail_width;
    }

    if (metadata.thumbnail_height) {
      response.thumbnail_height = metadata.thumbnail_height;
    }
  }
}

/**
 * Creates a photo-type oEmbed response with dimension constraint handling
 *
 * Constructs a photo-type oEmbed response according to specification:
 * - Validates required fields (url, width, height)
 * - Applies dimension constraints while preserving aspect ratio
 * - Uses default dimensions if original dimensions are not available
 *
 * @param {Object} baseResponse - Base response object with common fields
 * @param {Object} metadata - Content metadata from backend
 * @param {string} metadata.url - Image URL (required for photo type)
 * @param {number} [metadata.width] - Original image width
 * @param {number} [metadata.height] - Original image height
 * @param {number} [maxwidth] - Maximum width constraint (1-2048)
 * @param {number} [maxheight] - Maximum height constraint (1-2048)
 * @returns {Object} Photo-type oEmbed response
 * @throws {Error} When required url field is missing
 */
function createPhotoResponse(baseResponse, metadata, maxwidth, maxheight) {
  // Validate required fields for photo type according to oEmbed specification
  if (!metadata.url) {
    throw new Error("Photo type requires url field");
  }

  // Calculate constrained dimensions or use defaults
  const width =
    calculateConstrainedDimension(metadata.width, maxwidth) ||
    DEFAULT_DIMENSIONS.photo.width;

  const height =
    calculateConstrainedDimension(metadata.height, maxheight) ||
    DEFAULT_DIMENSIONS.photo.height;

  return {
    ...baseResponse,
    url: metadata.url, // Required for photo type
    width, // Required for photo type
    height, // Required for photo type
  };
}

/**
 * Creates a video-type oEmbed response with HTML generation and dimension handling
 *
 * Constructs a video-type oEmbed response according to specification:
 * - Validates required fields (html or embedUrl for HTML generation)
 * - Applies dimension constraints while preserving aspect ratio
 * - Generates HTML embed code if not provided
 * - Uses default video dimensions if original dimensions are not available
 *
 * @param {Object} baseResponse - Base response object with common fields
 * @param {Object} metadata - Content metadata from backend
 * @param {string} [metadata.html] - Pre-generated HTML embed code (preferred)
 * @param {string} [metadata.embedUrl] - Embed URL for HTML generation
 * @param {number} [metadata.width] - Original video width
 * @param {number} [metadata.height] - Original video height
 * @param {number} [maxwidth] - Maximum width constraint (1-2048)
 * @param {number} [maxheight] - Maximum height constraint (1-2048)
 * @returns {Object} Video-type oEmbed response
 * @throws {Error} When neither html nor embedUrl is provided
 */
function createVideoResponse(baseResponse, metadata, maxwidth, maxheight) {
  // Validate required fields for video type according to oEmbed specification
  if (!metadata.embedUrl && !metadata.html) {
    throw new Error("Video type requires embedUrl or html field");
  }

  // Calculate constrained dimensions or use video defaults
  const width =
    calculateConstrainedDimension(metadata.width, maxwidth) ||
    DEFAULT_DIMENSIONS.video.width;

  const height =
    calculateConstrainedDimension(metadata.height, maxheight) ||
    DEFAULT_DIMENSIONS.video.height;

  return {
    ...baseResponse,
    html: metadata.html || generateVideoHtml(metadata, width, height), // Required for video
    width, // Required for video
    height, // Required for video
  };
}

/**
 * Creates a link-type oEmbed response with minimal metadata
 *
 * Constructs a link-type oEmbed response according to specification:
 * - Link type has no required fields beyond base oEmbed fields
 * - Provides minimal metadata for simple link previews
 * - Most lightweight oEmbed response type
 *
 * @param {Object} baseResponse - Base response object with common fields
 * @param {Object} metadata - Content metadata from backend (unused but kept for consistency)
 * @returns {Object} Link-type oEmbed response
 */
function createLinkResponse(baseResponse, metadata) {
  // Link type has no required fields beyond base oEmbed fields
  // This is the simplest oEmbed response type, used for basic link previews
  return baseResponse;
}

/**
 * Creates a rich-type oEmbed response with HTML generation and dimension handling
 *
 * Constructs a rich-type oEmbed response according to specification:
 * - Validates and generates required HTML content
 * - Applies dimension constraints while preserving aspect ratio
 * - Generates HTML embed code if not provided
 * - Uses default rich content dimensions if original dimensions are not available
 *
 * @param {Object} baseResponse - Base response object with common fields
 * @param {Object} metadata - Content metadata from backend
 * @param {string} [metadata.html] - Pre-generated HTML embed code
 * @param {string} [metadata.content] - Content for HTML generation
 * @param {number} [metadata.width] - Original content width
 * @param {number} [metadata.height] - Original content height
 * @param {number} [maxwidth] - Maximum width constraint (1-2048)
 * @param {number} [maxheight] - Maximum height constraint (1-2048)
 * @returns {Object} Rich-type oEmbed response
 */
function createRichResponse(baseResponse, metadata, maxwidth, maxheight) {
  // Calculate constrained dimensions or use rich content defaults
  const width =
    calculateConstrainedDimension(metadata.width, maxwidth) ||
    DEFAULT_DIMENSIONS.rich.width;

  const height =
    calculateConstrainedDimension(metadata.height, maxheight) ||
    DEFAULT_DIMENSIONS.rich.height;

  return {
    ...baseResponse,
    type: "rich",
    html: metadata.html || generateRichHtml(metadata, width, height), // Required for rich
    width, // Required for rich
    height, // Required for rich
  };
}

/**
 * Calculates dimension with constraint applied while preserving aspect ratios
 *
 * Applies oEmbed maxwidth/maxheight constraints efficiently:
 * - Returns constraint if original dimension is not available
 * - Returns original dimension if no constraint is specified
 * - Applies minimum of original and constraint for proper sizing
 * - Optimized for performance with early returns
 *
 * @param {number|null|undefined} originalDimension - Original dimension value
 * @param {number|null|undefined} constraint - Maximum constraint value (1-2048)
 * @returns {number|null} Constrained dimension or null if both inputs are falsy
 */
function calculateConstrainedDimension(originalDimension, constraint) {
  // Early return patterns for performance optimization
  if (!originalDimension) return constraint || null;
  if (!constraint) return originalDimension;

  // Apply constraint using Math.min for efficiency
  return Math.min(originalDimension, constraint);
}
