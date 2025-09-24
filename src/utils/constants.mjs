/**
 * Application constants module
 *
 * This module defines all application constants including HTTP status codes,
 * oEmbed specification constants, configuration defaults, and error codes.
 * It provides a centralized location for all constant values used throughout
 * the application.
 *
 * @module utils/constants
 */

/**
 * HTTP status codes used in oEmbed responses
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * oEmbed specification constants
 */
export const OEMBED = {
  VERSION: "1.0",
  FORMATS: ["json", "xml"],
  CONTENT_TYPES: ["photo", "video", "rich", "link"],
  DEFAULT_FORMAT: "json",
  DEFAULT_CACHE_AGE: 3600, // 1 hour
  MAX_WIDTH_LIMIT: 2048,
  MAX_HEIGHT_LIMIT: 2048,
  MIN_DIMENSION: 1,
};

/**
 * Content types for easy reference
 */
export const CONTENT_TYPES = {
  PHOTO: "photo",
  VIDEO: "video",
  RICH: "rich",
  LINK: "link",
};

/**
 * Default cache ages for different content types (in seconds)
 */
export const DEFAULT_CACHE_AGES = {
  photo: 7200, // 2 hours - photos change less frequently
  video: 3600, // 1 hour - videos may have updated metadata
  rich: 1800, // 30 minutes - rich content may be dynamic
  link: 3600, // 1 hour - general content
};

/**
 * Default dimensions for different content types
 */
export const DEFAULT_DIMENSIONS = {
  video: {
    width: 640,
    height: 360,
  },
  rich: {
    width: 500,
    height: 300,
  },
  photo: {
    width: 800,
    height: 600,
  },
  widget: {
    width: 400,
    height: 300,
  },
};

/**
 * Error codes for different error scenarios
 */
export const ERROR_CODES = {
  MISSING_URL: "MISSING_URL",
  INVALID_URL: "INVALID_URL",
  MALFORMED_URL: "MALFORMED_URL",
  UNAUTHORIZED_DOMAIN: "UNAUTHORIZED_DOMAIN",
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_MAXWIDTH: "INVALID_MAXWIDTH",
  INVALID_MAXHEIGHT: "INVALID_MAXHEIGHT",
  CONTENT_NOT_FOUND: "CONTENT_NOT_FOUND",
  BACKEND_ERROR: "BACKEND_ERROR",
  MISSING_PROVIDER_DOMAIN: "MISSING_PROVIDER_DOMAIN",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

/**
 * Error messages corresponding to error codes
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.MISSING_URL]: "URL parameter is required",
  [ERROR_CODES.INVALID_URL]: "Invalid URL format",
  [ERROR_CODES.MALFORMED_URL]: "Invalid URL",
  [ERROR_CODES.UNAUTHORIZED_DOMAIN]: "Provider Domain Not Found",
  [ERROR_CODES.INVALID_FORMAT]: "Format not implemented",
  [ERROR_CODES.INVALID_MAXWIDTH]:
    "Maxwidth must be a number between 1 and 2048",
  [ERROR_CODES.INVALID_MAXHEIGHT]:
    "Maxheight must be a number between 1 and 2048",
  [ERROR_CODES.CONTENT_NOT_FOUND]: "Content not found",
  [ERROR_CODES.BACKEND_ERROR]: "Backend service error",
  [ERROR_CODES.MISSING_PROVIDER_DOMAIN]: "Provider domain not configured",
  [ERROR_CODES.MISSING_REQUIRED_FIELD]:
    "Required field missing for content type",
  [ERROR_CODES.INTERNAL_ERROR]: "Internal server error",
};

/**
 * Content type patterns for URL inference
 */
export const CONTENT_TYPE_PATTERNS = {
  video: ["/video/", "/watch/", "/embed/", "v=", "video="],
  photo: [
    "/photo/",
    "/image/",
    "/gallery/",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
  ],
  rich: ["/widget/", "/interactive/", "/app/"],
  link: [], // Default fallback
};

/**
 * Security-related constants
 */
export const SECURITY = {
  ALLOWED_PROTOCOLS: ["http:", "https:"],
  IFRAME_SANDBOX_ATTRIBUTES:
    "allow-scripts allow-same-origin allow-presentation",
  IFRAME_ALLOW_ATTRIBUTES:
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
  MAX_URL_LENGTH: 2048,
  MAX_TITLE_LENGTH: 200,
  MAX_AUTHOR_LENGTH: 100,
};

/**
 * Cache control settings
 */
export const CACHE_CONTROL = {
  DEFAULT_MAX_AGE: 3600, // 1 hour
  ERROR_MAX_AGE: 300, // 5 minutes
  SUCCESS_MAX_AGE: 3600, // 1 hour
  LONG_CACHE_MAX_AGE: 86400, // 24 hours
};

/**
 * CORS configuration
 */
export const CORS = {
  ALLOW_ORIGIN: "*",
  ALLOW_METHODS: "GET, OPTIONS",
  ALLOW_HEADERS: "Content-Type, Authorization",
  MAX_AGE: 86400, // 24 hours
};

/**
 * Lambda function configuration defaults
 */
export const LAMBDA_CONFIG = {
  DEFAULT_TIMEOUT: 5, // seconds
  DEFAULT_MEMORY: 128, // MB
  DEFAULT_RUNTIME: "nodejs20.x",
  DEFAULT_ARCHITECTURE: "arm64",
};

/**
 * Environment variable names
 */
export const ENV_VARS = {
  ENVIRONMENT: "ENVIRONMENT",
  PROVIDER_NAME: "PROVIDER_NAME",
  PROVIDER_URL: "PROVIDER_URL",
  PROVIDER_DOMAIN: "PROVIDER_DOMAIN",
  LOG_LEVEL: "LOG_LEVEL",
  NODE_ENV: "NODE_ENV",
  JEST_WORKER_ID: "JEST_WORKER_ID",
};

/**
 * Regular expressions for validation (ReDoS-safe patterns)
 */
export const REGEX_PATTERNS = {
  CONTENT_ID: /^[a-zA-Z0-9_-]{1,100}$/,
  URL_SAFE: /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]{1,2048}$/,
  NUMERIC: /^[0-9]{1,10}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]{1,100}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,6}$/,
  DOMAIN: /^[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,6}$/,
};

/**
 * API Gateway configuration constants
 */
export const API_GATEWAY = {
  ENDPOINT_TYPE: "EDGE",
  CORS_ENABLED: true,
  THROTTLING_RATE_LIMIT: 1000,
  THROTTLING_BURST_LIMIT: 2000,
};
