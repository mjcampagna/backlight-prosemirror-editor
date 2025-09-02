// Shared pattern utilities and constants

/**
 * Creates a safe regex tester that handles stateful regexes properly
 * @param {RegExp} pattern - The regex pattern
 * @returns {Function} Safe test function
 */
export function createSafeRegexTester(pattern) {
  return function(text) {
    // Create a new regex instance to avoid lastIndex mutations
    const safePattern = new RegExp(pattern.source, pattern.flags);
    return safePattern.test(text);
  };
}

/**
 * Table row pattern constant - shared between utilities
 * Matches lines that start with | and end with | (ignoring trailing spaces)
 */
export const TABLE_ROW_PATTERN = /^\|.*\|\s*$/;

/**
 * Safe table row tester
 */
export const isTableRowText = createSafeRegexTester(TABLE_ROW_PATTERN);

/**
 * Pre-compiled character escape regexes cache
 */
const ESCAPE_REGEX_CACHE = new Map();

/**
 * Gets or creates a regex for unescaping a specific character
 * @param {string} char - Character to unescape
 * @returns {RegExp} Compiled regex
 */
export function getUnescapeRegex(char) {
  if (!ESCAPE_REGEX_CACHE.has(char)) {
    const escapedChar = `\\${char}`;
    const regex = new RegExp(escapedChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    ESCAPE_REGEX_CACHE.set(char, regex);
  }
  return ESCAPE_REGEX_CACHE.get(char);
}
