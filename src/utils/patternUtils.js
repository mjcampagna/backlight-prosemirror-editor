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
 * Matches lines that start with | (ending | is optional per GFM spec)
 */
export const TABLE_ROW_PATTERN = /^\|.*$/;

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

/**
 * Gets or creates a regex for unescaping double-escaped characters
 * @param {string} char - Character to unescape
 * @returns {RegExp} Compiled regex for double escapes
 */
export function getDoubleUnescapeRegex(char) {
  const cacheKey = `double_${char}`;
  if (!ESCAPE_REGEX_CACHE.has(cacheKey)) {
    const doubleEscapedChar = `\\\\${char}`;
    const regex = new RegExp(doubleEscapedChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    ESCAPE_REGEX_CACHE.set(cacheKey, regex);
  }
  return ESCAPE_REGEX_CACHE.get(cacheKey);
}

/**
 * Double pipe pattern for detecting line break markers in table content
 * Matches || with optional spaces around them
 */
export const DOUBLE_PIPE_PATTERN = /\|\s*\|/g;

/**
 * Detects double pipes in text (ignoring spaces)
 * @param {string} text - Text to check
 * @returns {boolean} True if double pipes are found
 */
export function hasDoublePipes(text) {
  const safeTester = createSafeRegexTester(DOUBLE_PIPE_PATTERN);
  return safeTester(text);
}

/**
 * Converts double pipes to soft break markers
 * @param {string} text - Text containing double pipes
 * @returns {string} Text with double pipes replaced by soft break markers
 */
export function convertDoublePipesToSoftBreaks(text) {
  // Use a placeholder that won't conflict with normal content
  return text.replace(DOUBLE_PIPE_PATTERN, '\u{FEFF}SOFTBREAK\u{FEFF}');
}

/**
 * Converts soft break markers back to double pipes
 * @param {string} text - Text containing soft break markers  
 * @returns {string} Text with markers replaced by double pipes
 */
export function convertSoftBreaksToDoublePipes(text) {
  return text.replace(/\u{FEFF}SOFTBREAK\u{FEFF}/g, '||');
}

/**
 * Counts the number of cells in a table row
 * @param {string} line - Table row line
 * @returns {number} Number of cells
 */
export function countTableCells(line) {
  if (!line || !line.trim().startsWith('|')) return 0;
  
  const trimmed = line.trim();
  
  // Remove leading pipe
  let content = trimmed.slice(1);
  
  // Remove trailing pipe if present (optional in GFM)
  if (content.endsWith('|')) {
    content = content.slice(0, -1);
  }
  
  // Split by | to get cells
  const cells = content.split('|');
  
  return cells.length;
}

/**
 * Checks if a line is a valid GFM table separator row
 * @param {string} line - Line to check
 * @returns {boolean} True if valid separator row
 */
export function isTableSeparatorRow(line) {
  if (!line || !line.trim()) return false;
  const trimmed = line.trim();
  
  // Must start with |
  if (!trimmed.startsWith('|')) return false;
  
  // Remove leading pipe
  let content = trimmed.slice(1);
  
  // Remove trailing pipe if present
  if (content.endsWith('|')) {
    content = content.slice(0, -1);
  }
  
  // Split by | to check each column separator
  const columns = content.split('|');
  
  return columns.every(col => {
    const colTrimmed = col.trim();
    // Each column must be a valid alignment specifier: -, :-, -:, or :-:
    return /^:?-+:?$/.test(colTrimmed);
  });
}

/**
 * Validates table structure per GFM specification
 * Simple validation: only first two rows matter (header + separator)
 * @param {string} text - Node text content
 * @returns {{isValid: boolean, cssClass: string}} Validation result
 */
export function validateTableStructure(text) {
  if (!text || !text.trim()) {
    return { isValid: false, cssClass: 'pm-table-invalid' };
  }

  // Extract table-like lines (start with |)
  const tableLines = text.split(/\n/)
    .map(line => line.trim())
    .filter(line => line && line.startsWith('|'));

  if (tableLines.length === 0) {
    return { isValid: false, cssClass: 'pm-table-invalid' };
  }

  if (tableLines.length === 1) {
    // Single line - always valid table content
    return { isValid: true, cssClass: 'pm-table' };
  }

  // Multiple lines - apply GFM validation
  const headerRow = tableLines[0];
  const separatorRow = tableLines[1];
  
  // Per GFM: "The header row must match the delimiter row in the number of cells"
  if (isTableSeparatorRow(separatorRow)) {
    const headerCells = countTableCells(headerRow);
    const separatorCells = countTableCells(separatorRow);
    
    if (headerCells === separatorCells) {
      return { isValid: true, cssClass: 'pm-table' };
    }
    // Cell count mismatch - table not recognized per GFM
    return { isValid: false, cssClass: 'pm-table-invalid' };
  }

  // Second row is not a separator - not a valid table
  return { isValid: false, cssClass: 'pm-table-invalid' };
}
