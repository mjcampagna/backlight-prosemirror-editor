// GFM-compliant HTML block detection utility
// Based on GitHub Flavored Markdown specification

/**
 * Block-level HTML tag names (type 6)
 */
const BLOCK_LEVEL_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body',
  'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem',
  'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'section',
  'source', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'title', 'tr', 'track', 'ul'
]);

/**
 * HTML block types according to GFM spec
 */
export const HTML_BLOCK_TYPES = {
  SCRIPT_STYLE_PRE: 1,
  COMMENT: 2,
  PROCESSING_INSTRUCTION: 3,
  DECLARATION: 4,
  CDATA: 5,
  BLOCK_LEVEL: 6,
  OTHER: 7
};

/**
 * Check if a line starts an HTML block and determine its type
 * @param {string} line - The line to check
 * @returns {number|null} HTML block type (1-7) or null if not an HTML block start
 */
export function getHtmlBlockStartType(line) {
  const trimmed = line.trim();
  
  if (!trimmed) return null;
  
  // Type 1: Script, style, pre tags
  if (/^<(?:script|pre|style)(?:\s|>|$)/i.test(trimmed)) {
    return HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE;
  }
  
  // Type 2: Comments
  if (trimmed.startsWith('<!--')) {
    return HTML_BLOCK_TYPES.COMMENT;
  }
  
  // Type 3: Processing instructions
  if (trimmed.startsWith('<?')) {
    return HTML_BLOCK_TYPES.PROCESSING_INSTRUCTION;
  }
  
  // Type 4: Declarations
  if (/^<!([A-Z]+)/i.test(trimmed)) {
    return HTML_BLOCK_TYPES.DECLARATION;
  }
  
  // Type 5: CDATA sections
  if (trimmed.startsWith('<![CDATA[')) {
    return HTML_BLOCK_TYPES.CDATA;
  }
  
  // Type 6: Block-level tags
  const blockTagMatch = trimmed.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
  if (blockTagMatch) {
    const tagName = blockTagMatch[1].toLowerCase();
    if (BLOCK_LEVEL_TAGS.has(tagName)) {
      // Must be a complete tag: followed by whitespace + attributes + >, just >, or />
      if (/^<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*>|\/?>|>)/.test(trimmed)) {
        return HTML_BLOCK_TYPES.BLOCK_LEVEL;
      }
    }
  }
  
  // Type 7: Other complete HTML tags
  // Complete open tag: <tag> or <tag attr="value">
  // Complete close tag: </tag>
  if (/^<[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>$/.test(trimmed) || 
      /^<\/[a-zA-Z][a-zA-Z0-9-]*>$/.test(trimmed)) {
    return HTML_BLOCK_TYPES.OTHER;
  }
  
  return null;
}

/**
 * Check if a line ends an HTML block of a given type
 * @param {string} line - The line to check
 * @param {number} blockType - The HTML block type
 * @returns {boolean} True if this line ends the HTML block
 */
export function isHtmlBlockEnd(line, blockType) {
  const trimmed = line.trim();
  
  switch (blockType) {
    case HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE:
      return /<\/(?:script|pre|style)>/i.test(trimmed);
      
    case HTML_BLOCK_TYPES.COMMENT:
      return trimmed.includes('-->');
      
    case HTML_BLOCK_TYPES.PROCESSING_INSTRUCTION:
      return trimmed.includes('?>');
      
    case HTML_BLOCK_TYPES.DECLARATION:
      return trimmed.includes('>');
      
    case HTML_BLOCK_TYPES.CDATA:
      return trimmed.includes(']]>');
      
    case HTML_BLOCK_TYPES.BLOCK_LEVEL:
    case HTML_BLOCK_TYPES.OTHER:
      // End with blank line (checked elsewhere)
      return false;
      
    default:
      return false;
  }
}

/**
 * Analyze lines to find HTML block ranges
 * @param {string[]} lines - Array of lines to analyze
 * @returns {Array} Array of {start, end, type} objects representing HTML blocks
 */
export function findHtmlBlocks(lines) {
  const blocks = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const blockType = getHtmlBlockStartType(line);
    
    if (blockType !== null) {
      const start = i;
      let end = i;
      
      if (blockType === HTML_BLOCK_TYPES.BLOCK_LEVEL || blockType === HTML_BLOCK_TYPES.OTHER) {
        // Types 6 & 7: End at blank line
        end = i;
        while (end + 1 < lines.length && lines[end + 1].trim() !== '') {
          end++;
        }
      } else {
        // Types 1-5: End at specific closing marker
        end = i;
        while (end < lines.length) {
          if (isHtmlBlockEnd(lines[end], blockType)) {
            break;
          }
          end++;
        }
      }
      
      blocks.push({ start, end, type: blockType });
      i = end + 1;
    } else {
      i++;
    }
  }
  
  return blocks;
}

/**
 * Check if a line number is inside any HTML block
 * @param {number} lineNumber - Zero-based line number
 * @param {string[]} lines - Array of lines
 * @returns {Object|null} HTML block info {start, end, type} or null
 */
export function isLineInHtmlBlock(lineNumber, lines) {
  const blocks = findHtmlBlocks(lines);
  
  for (const block of blocks) {
    if (lineNumber >= block.start && lineNumber <= block.end) {
      return block;
    }
  }
  
  return null;
}

/**
 * Check if any part of a line range is inside HTML blocks
 * @param {number} startLine - Zero-based start line
 * @param {number} endLine - Zero-based end line
 * @param {string[]} lines - Array of lines
 * @returns {boolean} True if any part of the range is in HTML blocks
 */
export function isRangeInHtmlBlock(startLine, endLine, lines) {
  for (let i = startLine; i <= endLine; i++) {
    if (isLineInHtmlBlock(i, lines)) {
      return true;
    }
  }
  return false;
}
