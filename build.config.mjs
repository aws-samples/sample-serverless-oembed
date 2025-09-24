/**
 * Build configuration for Lambda function optimization
 *
 * This configuration file defines the build process for optimizing
 * the Lambda function bundle size and performance through:
 * - Tree shaking to remove unused code
 * - Minification for smaller bundle size
 * - ES module optimization
 * - External dependency handling
 */

export default {
  // ESBuild configuration for bundling and optimization
  esbuild: {
    entryPoints: ["src/handlers/oembed.mjs"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    outfile: "dist/oembed.mjs",

    // External dependencies (AWS SDK is provided by Lambda runtime)
    external: ["@aws-sdk/*", "aws-sdk"],

    // Tree shaking configuration
    treeShaking: true,

    // Minification settings
    minify: false, // We'll use Terser for better minification

    // Source map for debugging (disable in production)
    sourcemap: process.env.NODE_ENV !== "production",

    // Bundle analysis
    metafile: true,

    // Define environment variables at build time
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "production"
      ),
    },

    // Banner to preserve ES module compatibility
    banner: {
      js: "// AWS Lambda oEmbed Provider - Optimized Bundle",
    },
  },

  // Terser configuration for advanced minification
  terser: {
    compress: {
      // Remove console.log in production
      drop_console: process.env.NODE_ENV === "production",
      // Remove debugger statements
      drop_debugger: true,
      // Remove unused variables
      unused: true,
      // Collapse single-use variables
      collapse_vars: true,
      // Reduce variable names
      reduce_vars: true,
      // Remove dead code
      dead_code: true,
    },

    mangle: {
      // Preserve function names for better error reporting
      keep_fnames: true,
      // Preserve class names
      keep_classnames: true,
    },

    format: {
      // Remove comments
      comments: false,
      // Preserve ES6 features
      ecma: 2020,
    },
  },

  // Bundle analysis configuration
  analysis: {
    // Generate bundle size report
    generateReport: true,
    // Size limits (in KB)
    limits: {
      warning: 500, // Warn if bundle > 500KB
      error: 1000, // Error if bundle > 1MB
    },
  },
};
