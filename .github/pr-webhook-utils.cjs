/**
 * Utilities for PR webhook data handling and sanitization
 */

/**
 * Sanitizes text content to remove truly sensitive information
 * @param {string} text - Text content to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (!text) return '';
  
  try {
    return text
      // Remove common API tokens with specific patterns
      .replace(/(\b)(gh[ps]_[A-Za-z0-9_]{36,})(\b)/g, '[GH_TOKEN_REDACTED]')
      .replace(/(\b)(xox[pbar]-[0-9a-zA-Z-]{10,})(\b)/g, '[SLACK_TOKEN_REDACTED]')
      .replace(/(\b)(sk-[a-zA-Z0-9]{32,})(\b)/g, '[API_KEY_REDACTED]')
      .replace(/(\b)(AKIA[0-9A-Z]{16})(\b)/g, '[AWS_KEY_REDACTED]')
      // Remove emails, but only likely real ones (with valid TLDs)
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g, '[EMAIL_REDACTED]')
      // Remove IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]')
      // Remove control characters that might break JSON
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  } catch (error) {
    console.warn(`Error sanitizing text: ${error.message}`);
    return ''; // Return empty string on error rather than breaking
  }
}

/**
 * Checks if a file should be included in webhook data
 * @param {string} filename - Filename to check
 * @returns {boolean} Whether file should be included
 */
function shouldIncludeFile(filename) {
  if (!filename) return false;
  
  const sensitivePatterns = [
    // Only exclude actual sensitive files
    /\.env($|\.)/i,
    /\.key$/i, 
    /\.pem$/i, 
    /\.pfx$/i, 
    /\.p12$/i,
    // Binary files that would bloat the payload
    /\.(jpg|jpeg|png|gif|ico|pdf|zip|tar|gz|bin|exe)$/i
  ];
  
  return !sensitivePatterns.some(pattern => pattern.test(filename));
}

/**
 * Safely limits patch size to prevent payload issues
 * @param {string} patch - Git patch content
 * @returns {string|undefined} Limited patch or undefined on error
 */
function limitPatch(patch) {
  if (!patch) return undefined;
  
  try {
    // Increase reasonable patch size limit to 30KB
    const maxPatchSize = 30 * 1024;
    if (patch.length > maxPatchSize) {
      return patch.substring(0, maxPatchSize) + '\n[... PATCH TRUNCATED DUE TO SIZE ...]';
    }
    return patch;
  } catch (error) {
    console.warn(`Error limiting patch: ${error.message}`);
    return undefined; // Return undefined on error
  }
}

/**
 * Safely stringifies JSON with error handling
 * @param {Object} data - Data to stringify
 * @returns {Object} Result with success status and data/error
 */
function safeStringify(data) {
  try {
    const jsonData = JSON.stringify(data);
    return { success: true, data: jsonData };
  } catch (error) {
    console.error(`JSON stringify error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates a simplified version of PR data that's less likely to cause parsing issues
 * @param {Object} pr - Full PR data
 * @param {Object} context - GitHub context object
 * @returns {Object} Simplified PR data
 */
function createSimplifiedPrData(pr, context) {
  return {
    id: pr.data.id,
    number: pr.data.number,
    title: sanitizeText(pr.data.title),
    state: pr.data.state,
    created_at: pr.data.created_at,
    repository: context.repo.repo,
    owner: context.repo.owner,
    body: sanitizeText(pr.data.body?.substring(0, 1000)),
    head: { 
      ref: pr.data.head.ref,
      sha: pr.data.head.sha
    },
    base: {
      ref: pr.data.base.ref,
      sha: pr.data.base.sha
    },
    labels: pr.data.labels?.map(l => l.name),
    error: 'Using simplified payload due to JSON serialization issues with full payload'
  };
}

module.exports = {
  sanitizeText,
  shouldIncludeFile,
  limitPatch,
  safeStringify,
  createSimplifiedPrData
};
