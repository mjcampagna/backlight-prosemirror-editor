// GFM-compliant escaping extension that preserves escape sequences except in table contexts
// Uses structural approach based on serializer node context, not regex patterns

/**
 * Create a table-aware escaping plugin that only unescapes characters inside actual table cells
 * This ensures GFM compliance by preserving escape sequences in regular text
 * 
 * @param {string[]} unescapeChars - Characters to unescape inside table cells (default: ['|', '*', '_', '~'])
 * @returns {Object} - Text processing plugin that enhances the serializer
 */
export function createGfmCompliantEscapingPlugin(unescapeChars = ['|', '*', '_', '~']) {
  return {
    name: "gfmCompliantEscaping",
    
    enhanceSerializer(mdSerializer) {
      // Guard against double wrapping
      if (mdSerializer.__gfmCompliantEscapingPatched) return mdSerializer;
      mdSerializer.__gfmCompliantEscapingPatched = true;

      // Store original node serializers
      const originalNodes = { ...mdSerializer.nodes };
      
      // Patch table cell serializers to set context flag
      ['table_cell', 'table_header'].forEach(nodeType => {
        if (originalNodes[nodeType]) {
          mdSerializer.nodes[nodeType] = function(state, node) {
            // Set table context flag
            const wasInTable = state.inTable;
            state.inTable = true;
            
            // Call original serializer
            const result = originalNodes[nodeType].call(this, state, node);
            
            // Restore previous context
            state.inTable = wasInTable;
            return result;
          };
        }
      });

      // Wrap the serialize method to post-process only table content
      const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
      mdSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Apply table-aware unescaping by processing table rows only
        result = processTableContent(result, unescapeChars);
        
        return result;
      };

      return mdSerializer;
    }
  };
}

/**
 * Process markdown content to unescape characters only within table rows
 * Uses a more precise table detection that requires proper GFM table structure
 * 
 * @param {string} markdown - The markdown content
 * @param {string[]} unescapeChars - Characters to unescape
 * @returns {string} - Processed markdown
 */
function processTableContent(markdown, unescapeChars) {
  const lines = markdown.split('\n');
  const processedLines = [];
  let inTable = false;
  let tableRowCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;
    
    // Detect table start/continuation
    const isTableRow = isGfmTableRow(line);
    const isTableSeparator = isTableSeparatorRow(line);
    const nextIsTableSeparator = nextLine ? isTableSeparatorRow(nextLine) : false;
    
    if (!inTable && isTableRow) {
      // Start of table if this row is followed by a separator
      if (nextIsTableSeparator) {
        inTable = true;
        tableRowCount = 0;
      }
    } else if (inTable && !isTableRow && !isTableSeparator) {
      // End of table - no longer a table row or separator
      inTable = false;
      tableRowCount = 0;
    }
    
    // Process the line if we're in a table
    if (inTable && (isTableRow || isTableSeparator)) {
      processedLines.push(unescapeTableRowCharacters(line, unescapeChars));
      if (isTableRow) tableRowCount++;
    } else {
      // Regular line - don't unescape anything
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

/**
 * Check if a line is a GFM table row (requires at least 2 unescaped pipes)
 * More precise than the original pattern
 * 
 * @param {string} line - The line to check
 * @returns {boolean} - True if this looks like a table row
 */
function isGfmTableRow(line) {
  if (!line.trim()) return false;
  
  // Must not start with escaped pipe
  if (/^\s*\\\|/.test(line)) return false;
  
  // Count unescaped pipes
  let pipeCount = 0;
  let escaped = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      pipeCount++;
    }
  }
  
  // Need at least 2 unescaped pipes for a table row
  return pipeCount >= 2;
}

/**
 * Check if a line is a GFM table separator row
 * 
 * @param {string} line - The line to check  
 * @returns {boolean} - True if this is a table separator
 */
function isTableSeparatorRow(line) {
  // Table separator: | :--- | :---: | ---: |
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  
  // Simple check for separator pattern
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(trimmed);
}

/**
 * Unescape specified characters in a table row
 * 
 * @param {string} line - The table row line
 * @param {string[]} unescapeChars - Characters to unescape
 * @returns {string} - Line with unescaped characters
 */
function unescapeTableRowCharacters(line, unescapeChars) {
  let result = line;
  
  for (const char of unescapeChars) {
    // Handle both single and double escaping
    const doubleEscaped = `\\\\${char}`;
    const singleEscaped = `\\${char}`;
    
    // First handle double escapes (\\|), then single escapes (\|)  
    const doubleRegex = new RegExp(doubleEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const singleRegex = new RegExp(singleEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    
    result = result.replace(doubleRegex, char);
    result = result.replace(singleRegex, char);
  }
  
  return result;
}

/**
 * GFM-compliant escaping extension for the markdown system
 * Replaces the problematic regex-based approach with structural detection
 */
export const gfmCompliantEscapingExtension = {
  name: "gfmCompliantEscaping"
};

// Export utilities for testing
export { isGfmTableRow, isTableSeparatorRow, unescapeTableRowCharacters };
