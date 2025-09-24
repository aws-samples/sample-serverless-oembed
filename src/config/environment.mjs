/**
 * Environment configuration management module
 *
 * This module handles environment variable processing, configuration validation,
 * default value management, and type conversion utilities. It provides a
 * centralized way to access and validate all environment-based configuration.
 *
 * @module config/environment
 */

import { ENV_VARS } from "../utils/constants.mjs";

/**
 * Environment configuration object with validated values
 */
export const config = {
  // Deployment environment
  environment: process.env[ENV_VARS.ENVIRONMENT] || "dev",

  // Provider information
  providerName: process.env[ENV_VARS.PROVIDER_NAME] || "oEmbed Provider",
  providerUrl: process.env[ENV_VARS.PROVIDER_URL] || "https://example.com",
  providerDomain: process.env[ENV_VARS.PROVIDER_DOMAIN] || "example.com",

  // Logging configuration
  logLevel: process.env[ENV_VARS.LOG_LEVEL] || "INFO",

  // Runtime environment
  nodeEnv: process.env[ENV_VARS.NODE_ENV] || "production",
  isTest: !!(
    process.env[ENV_VARS.NODE_ENV] === "test" ||
    process.env[ENV_VARS.JEST_WORKER_ID]
  ),

  // AWS Lambda context (available at runtime)
  awsRegion: process.env.AWS_REGION || "us-east-1",
  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || "oembedFunction",
  functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION || "$LATEST",
};

/**
 * Validates the current environment configuration
 * @returns {Object} Validation result with isValid flag and errors
 */
export function validateConfig() {
  const errors = [];

  // Required environment variables
  const requiredVars = [
    { key: "PROVIDER_NAME", value: config.providerName },
    { key: "PROVIDER_URL", value: config.providerUrl },
    { key: "PROVIDER_DOMAIN", value: config.providerDomain },
  ];

  // Check for missing required variables
  requiredVars.forEach(({ key, value }) => {
    if (!value || value === "undefined") {
      errors.push({
        variable: key,
        message: `${key} environment variable is required`,
        severity: "error",
      });
    }
  });

  // Validate provider URL format
  if (config.providerUrl && !isValidUrl(config.providerUrl)) {
    errors.push({
      variable: "PROVIDER_URL",
      message: "PROVIDER_URL must be a valid URL",
      severity: "error",
    });
  }

  // Validate provider domain format
  if (config.providerDomain && !isValidDomain(config.providerDomain)) {
    errors.push({
      variable: "PROVIDER_DOMAIN",
      message: "PROVIDER_DOMAIN must be a valid domain name",
      severity: "warning",
    });
  }

  // Validate log level
  const validLogLevels = ["ERROR", "WARN", "INFO", "DEBUG"];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push({
      variable: "LOG_LEVEL",
      message: `LOG_LEVEL must be one of: ${validLogLevels.join(", ")}`,
      severity: "warning",
    });
  }

  // Validate environment
  const validEnvironments = ["dev", "stage", "prod", "test"];
  if (!validEnvironments.includes(config.environment)) {
    errors.push({
      variable: "ENVIRONMENT",
      message: `ENVIRONMENT should be one of: ${validEnvironments.join(", ")}`,
      severity: "warning",
    });
  }

  return {
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    warnings: errors.filter((e) => e.severity === "warning"),
    criticalErrors: errors.filter((e) => e.severity === "error"),
  };
}

/**
 * Gets environment-specific configuration
 * @param {string} environment - Environment name (dev, stage, prod)
 * @returns {Object} Environment-specific configuration overrides
 */
export function getEnvironmentConfig(environment = config.environment) {
  const baseConfig = {
    dev: {
      logLevel: "DEBUG",
      cacheAge: 300, // 5 minutes
      enableDetailedErrors: true,
    },
    stage: {
      logLevel: "INFO",
      cacheAge: 1800, // 30 minutes
      enableDetailedErrors: true,
    },
    prod: {
      logLevel: "WARN",
      cacheAge: 3600, // 1 hour
      enableDetailedErrors: false,
    },
    test: {
      logLevel: "ERROR",
      cacheAge: 0,
      enableDetailedErrors: true,
    },
  };

  return baseConfig[environment] || baseConfig.dev;
}

/**
 * Gets the complete configuration with environment-specific overrides
 * @returns {Object} Complete configuration object
 */
export function getConfig() {
  const envConfig = getEnvironmentConfig();

  return {
    ...config,
    ...envConfig,
    // Computed values
    isDevelopment: config.environment === "dev",
    isStaging: config.environment === "stage",
    isProduction: config.environment === "prod",
    isTest: config.isTest,
  };
}

/**
 * Validates if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid domain name
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if valid domain
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== "string") return false;

  // Length check first to prevent ReDoS
  if (domain.length > 253) return false;

  // ReDoS-safe domain validation - simplified pattern
  const domainRegex = /^[a-zA-Z0-9.-]+$/;

  if (!domainRegex.test(domain)) return false;

  // Additional validation checks
  const parts = domain.split('.');
  if (parts.length < 2) return false;

  return parts.every(part =>
    part.length > 0 &&
    part.length <= 63 &&
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(part)
  );
}

/**
 * Gets a configuration value with type conversion
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if not found
 * @param {string} type - Type to convert to ('string', 'number', 'boolean')
 * @returns {any} Configuration value with proper type
 */
export function getConfigValue(key, defaultValue = null, type = "string") {
  const value = process.env[key] || defaultValue;

  if (value === null || value === undefined) return defaultValue;

  switch (type) {
    case "number":
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;

    case "boolean":
      if (typeof value === "boolean") return value;
      return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());

    case "array":
      if (Array.isArray(value)) return value;
      return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    default:
      return String(value);
  }
}

/**
 * Logs the current configuration (excluding sensitive values)
 */
export function logConfiguration() {
  const safeConfig = {
    environment: config.environment,
    providerName: config.providerName,
    providerUrl: config.providerUrl,
    providerDomain: config.providerDomain,
    logLevel: config.logLevel,
    nodeEnv: config.nodeEnv,
    isTest: config.isTest,
    awsRegion: config.awsRegion,
    functionName: config.functionName,
  };

  console.log("Configuration loaded:", JSON.stringify(safeConfig, null, 2));
}
