/**
 * Security utilities module
 *
 * This module provides security-focused utility functions for input validation,
 * sanitization, and protection against common web vulnerabilities.
 *
 * @module utils/security
 */

import { REGEX_PATTERNS, SECURITY } from "./constants.mjs";

/**
 * Validates and sanitizes URLs to prevent injection attacks
 * @param {string} url - URL to validate
 * @returns {Object} Validation result with sanitized URL
 */
export function validateAndSanitizeUrl(url) {
    if (typeof url !== "string" || url.length === 0) {
        return { isValid: false, error: "URL must be a non-empty string" };
    }

    if (url.length > SECURITY.MAX_URL_LENGTH) {
        return { isValid: false, error: "URL exceeds maximum length" };
    }

    try {
        const urlObj = new URL(url);

        // Only allow HTTP and HTTPS protocols
        if (!SECURITY.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
            return { isValid: false, error: "Only HTTP and HTTPS protocols are allowed" };
        }

        // Sanitize the URL by reconstructing it
        const sanitizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;

        return {
            isValid: true,
            sanitizedUrl,
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            pathname: urlObj.pathname
        };
    } catch (error) {
        return { isValid: false, error: "Invalid URL format" };
    }
}

/**
 * Sanitizes text content to prevent XSS attacks
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
export function sanitizeText(text, maxLength = 500) {
    if (typeof text !== "string") return "";

    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/javascript:/gi, "") // Remove javascript: URLs
        .replace(/data:/gi, "") // Remove data: URLs
        .replace(/vbscript:/gi, "") // Remove vbscript: URLs
        .trim()
        .substring(0, maxLength);
}

/**
 * Sanitizes HTML content for safe embedding
 * @param {string} html - HTML to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, maxLength = 10000) {
    if (typeof html !== "string") return "";

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
        .substring(0, maxLength);
}

/**
 * Validates numeric input with bounds checking
 * @param {*} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Object} Validation result
 */
export function validateNumeric(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const num = parseInt(value, 10);

    if (isNaN(num)) {
        return { isValid: false, error: "Value must be a number" };
    }

    if (num < min || num > max) {
        return { isValid: false, error: `Value must be between ${min} and ${max}` };
    }

    return { isValid: true, value: num };
}

/**
 * Validates content ID format
 * @param {string} contentId - Content ID to validate
 * @returns {Object} Validation result
 */
export function validateContentId(contentId) {
    if (typeof contentId !== "string") {
        return { isValid: false, error: "Content ID must be a string" };
    }

    if (!REGEX_PATTERNS.CONTENT_ID.test(contentId)) {
        return { isValid: false, error: "Invalid content ID format" };
    }

    return { isValid: true, contentId };
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export function validateEmail(email) {
    if (typeof email !== "string") {
        return { isValid: false, error: "Email must be a string" };
    }

    if (!REGEX_PATTERNS.EMAIL.test(email)) {
        return { isValid: false, error: "Invalid email format" };
    }

    return { isValid: true, email: email.toLowerCase() };
}

/**
 * Validates domain format
 * @param {string} domain - Domain to validate
 * @returns {Object} Validation result
 */
export function validateDomain(domain) {
    if (typeof domain !== "string") {
        return { isValid: false, error: "Domain must be a string" };
    }

    if (!REGEX_PATTERNS.DOMAIN.test(domain)) {
        return { isValid: false, error: "Invalid domain format" };
    }

    return { isValid: true, domain: domain.toLowerCase() };
}

/**
 * Escapes HTML attributes to prevent injection
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
export function escapeHtmlAttribute(value) {
    if (typeof value !== "string") return "";

    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Creates a secure iframe embed with proper sandboxing
 * @param {string} src - Source URL
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} options - Additional options
 * @returns {string} Secure iframe HTML
 */
export function createSecureIframe(src, width, height, options = {}) {
    const urlValidation = validateAndSanitizeUrl(src);
    if (!urlValidation.isValid) {
        return "<div>Invalid embed URL</div>";
    }

    const numericWidth = validateNumeric(width, 100, 2048);
    const numericHeight = validateNumeric(height, 100, 2048);

    if (!numericWidth.isValid || !numericHeight.isValid) {
        return "<div>Invalid dimensions</div>";
    }

    // Ensure HTTPS for security
    const secureUrl = urlValidation.sanitizedUrl.replace(/^http:/, 'https:');
    const escapedUrl = escapeHtmlAttribute(secureUrl);

    const sandbox = options.sandbox || SECURITY.IFRAME_SANDBOX_ATTRIBUTES;
    const allow = options.allow || SECURITY.IFRAME_ALLOW_ATTRIBUTES;

    return `<iframe src="${escapedUrl}" width="${numericWidth.value}" height="${numericHeight.value}" frameborder="0" sandbox="${sandbox}" allow="${allow}"></iframe>`;
}

/**
 * Rate limiting helper (basic implementation)
 * @param {string} _key - Rate limit key (unused in basic implementation)
 * @param {number} limit - Request limit
 * @param {number} window - Time window in seconds
 * @returns {Object} Rate limit result
 */
export function checkRateLimit(_key, limit = 100, window = 3600) {
    // This is a basic implementation - in production, use Redis or DynamoDB
    const now = Date.now();

    // In a real implementation, you would store and check request counts
    // For now, we'll just return allowed
    return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + (window * 1000)
    };
}

/**
 * Validates request headers for security
 * @param {Object} headers - Request headers
 * @returns {Object} Validation result
 */
export function validateRequestHeaders(headers) {
    const issues = [];

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-real-ip', 'x-forwarded-for'];
    for (const header of suspiciousHeaders) {
        if (headers[header] && headers[header].includes('localhost')) {
            issues.push(`Suspicious ${header} header detected`);
        }
    }

    // Check user agent
    if (headers['user-agent'] && headers['user-agent'].length > 500) {
        issues.push('User agent header too long');
    }

    return {
        isValid: issues.length === 0,
        issues
    };
}