/**
 * Portable GFM Table Identification Utilities
 * Self-contained module for detecting and validating Markdown tables
 */

/**
 * Table row pattern - matches lines starting with |
 * Per GFM spec, trailing | is optional
 */
export const TABLE_ROW_PATTERN = /^\|.*$/;

/**
 * Tests if text matches the table row pattern
 * @param {string} text - Text to test
 * @returns {boolean}
 */
export function isTableRow(text) {
  return TABLE_ROW_PATTERN.test(text);
}

/**
 * Counts the number of cells in a table row
 * @param {string} line - Table row line
 * @returns {number} Number of cells
 */
export function countTableCells(line) {
  if (!line || !line.trim().startsWith('|')) return 0;
  
  const trimmed = line.trim();
  let content = trimmed.slice(1);
  
  if (content.endsWith('|')) {
    content = content.slice(0, -1);
  }
  
  return content.split('|').length;
}

/**
 * Checks if a line is a valid GFM table separator row
 * Separator rows contain only dashes and optional colons for alignment
 * Examples: |---|---|, |:--|--:|, |:-:|:-:|
 * @param {string} line - Line to check
 * @returns {boolean}
 */
export function isTableSeparatorRow(line) {
  if (!line || !line.trim()) return false;
  const trimmed = line.trim();
  
  if (!trimmed.startsWith('|')) return false;
  
  let content = trimmed.slice(1);
  if (content.endsWith('|')) {
    content = content.slice(0, -1);
  }
  
  const columns = content.split('|');
  return columns.every(col => /^:?-+:?$/.test(col.trim()));
}

/**
 * Validates if markdown text represents a valid GFM table
 * A valid table requires:
 * - At least 2 rows (header + separator)
 * - Second row must be a valid separator row
 * - Header and separator must have matching column counts
 * @param {string} markdown - Markdown text to validate
 * @returns {{isValid: boolean, rowCount: number, columnCount: number}}
 */
export function validateTable(markdown) {
  if (!markdown) {
    return { isValid: false, rowCount: 0, columnCount: 0 };
  }

  const tableLines = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('|'));

  if (tableLines.length < 2) {
    return { isValid: false, rowCount: tableLines.length, columnCount: 0 };
  }

  const headerRow = tableLines[0];
  const separatorRow = tableLines[1];

  if (!isTableSeparatorRow(separatorRow)) {
    return { isValid: false, rowCount: tableLines.length, columnCount: 0 };
  }

  const headerCells = countTableCells(headerRow);
  const separatorCells = countTableCells(separatorRow);

  if (headerCells !== separatorCells) {
    return { isValid: false, rowCount: tableLines.length, columnCount: headerCells };
  }

  return { 
    isValid: true, 
    rowCount: tableLines.length, 
    columnCount: headerCells 
  };
}

/**
 * Extracts table rows from markdown text
 * @param {string} markdown - Markdown text
 * @returns {string[]} Array of table row lines
 */
export function extractTableRows(markdown) {
  if (!markdown) return [];
  
  return markdown
    .split('\n')
    .filter(line => isTableRow(line.trim()));
}

/**
 * Parses cell content from a table row line
 * @param {string} line - Table row line
 * @returns {string[]} Array of cell contents (trimmed)
 */
export function parseCells(line) {
  if (!line || !line.trim().startsWith('|')) return [];
  
  let content = line.trim().slice(1);
  if (content.endsWith('|')) {
    content = content.slice(0, -1);
  }
  
  return content.split('|').map(cell => cell.trim());
}

/**
 * Extracts alignment from a separator row
 * @param {string} separatorLine - Separator row line
 * @returns {Array<'left'|'center'|'right'|'none'>} Array of alignments per column
 */
export function parseAlignment(separatorLine) {
  if (!isTableSeparatorRow(separatorLine)) return [];
  
  const cells = parseCells(separatorLine);
  return cells.map(cell => {
    const trimmed = cell.trim();
    const leftColon = trimmed.startsWith(':');
    const rightColon = trimmed.endsWith(':');
    
    if (leftColon && rightColon) return 'center';
    if (rightColon) return 'right';
    if (leftColon) return 'left';
    return 'none';
  });
}

/**
 * Row types in a parsed table
 */
export const ROW_TYPES = {
  HEADER: 'header',
  SEPARATOR: 'separator',
  DATA: 'data'
};

/**
 * Parses a markdown table into an array of row objects
 * @param {string} markdown - Markdown table text
 * @returns {{
 *   rows: Array<{type: string, cells: string[], raw: string, index: number}>,
 *   headers: string[],
 *   alignments: Array<'left'|'center'|'right'|'none'>,
 *   isValid: boolean,
 *   columnCount: number
 * }}
 */
export function parseTable(markdown) {
  if (!markdown) {
    return { rows: [], headers: [], alignments: [], isValid: false, columnCount: 0 };
  }
  
  const lines = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('|'));
  
  if (lines.length === 0) {
    return { rows: [], headers: [], alignments: [], isValid: false, columnCount: 0 };
  }
  
  const rows = [];
  let headers = [];
  let alignments = [];
  let isValid = false;
  let columnCount = 0;
  
  lines.forEach((line, index) => {
    const cells = parseCells(line);
    
    if (index === 0) {
      // Header row
      headers = cells;
      columnCount = cells.length;
      rows.push({ type: ROW_TYPES.HEADER, cells, raw: line, index });
    } else if (index === 1 && isTableSeparatorRow(line)) {
      // Separator row
      alignments = parseAlignment(line);
      isValid = cells.length === columnCount;
      rows.push({ type: ROW_TYPES.SEPARATOR, cells, raw: line, index });
    } else {
      // Data row
      rows.push({ type: ROW_TYPES.DATA, cells, raw: line, index });
    }
  });
  
  return { rows, headers, alignments, isValid, columnCount };
}

/**
 * Gets only the data rows (excludes header and separator)
 * @param {string} markdown - Markdown table text
 * @returns {Array<{cells: string[], raw: string, index: number}>}
 */
export function getDataRows(markdown) {
  const { rows } = parseTable(markdown);
  return rows.filter(row => row.type === ROW_TYPES.DATA);
}
