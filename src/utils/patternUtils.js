// Shared pattern utilities and constants

/**
 * Creates a safe regex tester that handles stateful regexes properly
 * @param {RegExp} pattern - The regex pattern
 * @returns {Function} Safe test function
 */
export function createSafeRegexTester(pattern) {
  // Create non-global version to avoid lastIndex issues
  const safePattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));
  return function(text) {
    safePattern.lastIndex = 0;
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
 * Validates table structure using actual serialization round-trip
 * @param {Object} node - The ProseMirror node to validate
 * @param {Object} serializer - The markdown serializer
 * @param {Object} parser - The markdown parser
 * @returns {{isValid: boolean, cssClass: string}} Validation result
 */
export function validateTableStructureWithSerialization(node, serializer) {
  if (!node || !serializer) {
    return { isValid: false, cssClass: 'pm-block-invalid' };
  }

  try {
    // Step 1: Serialize node to clean markdown
    const markdown = serializer.serialize(node);
    
    // Step 2: Validate the markdown directly (much simpler!)
    const tableLines = markdown.split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('|'));
    
    if (tableLines.length === 0) {
      return { isValid: false, cssClass: 'pm-block-invalid' };
    }
    
    if (tableLines.length === 1) {
      // Single row - invalid per GFM (requires header + separator minimum)
      return { isValid: false, cssClass: 'pm-block-invalid' };
    }
    
    // Multiple rows - apply GFM validation  
    const headerRow = tableLines[0];
    const separatorRow = tableLines[1];
    
    if (isTableSeparatorRow(separatorRow)) {
      const headerCells = countTableCells(headerRow);
      const separatorCells = countTableCells(separatorRow);
      
      if (headerCells === separatorCells) {
        return { isValid: true, cssClass: 'pm-table' };
      }
      return { isValid: false, cssClass: 'pm-block-invalid' };
    }
    
    return { isValid: false, cssClass: 'pm-block-invalid' };
    
  } catch (error) {
    console.warn('Table validation error:', error);
    return { isValid: false, cssClass: 'pm-block-invalid' };
  }
}

/**
 * Fallback text-based validation for tests
 * @param {string} text - Node text content
 * @returns {{isValid: boolean, cssClass: string}} Validation result
 */
export function validateTableStructure(text) {
  // Simple fallback for tests - single rows invalid per GFM
  if (!text || !text.trim() || !text.includes('|') || !text.trim().startsWith('|')) {
    return { isValid: false, cssClass: 'pm-block-invalid' };
  }
  
  // Check if this has multiple lines (would be valid)
  const lines = text.split('\n').filter(line => line.trim().startsWith('|'));
  if (lines.length >= 2) {
    return { isValid: true, cssClass: 'pm-table' };
  }
  
  // Single line - invalid per GFM
  return { isValid: false, cssClass: 'pm-block-invalid' };
}
