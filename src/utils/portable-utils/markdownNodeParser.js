/**
 * Portable Markdown Node Parser
 * Splits Markdown content into discrete logical nodes (blocks)
 */

/**
 * Node types that can be identified
 */
export const NODE_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  CODE_BLOCK: 'code_block',
  BLOCKQUOTE: 'blockquote',
  UNORDERED_LIST: 'unordered_list',
  ORDERED_LIST: 'ordered_list',
  TABLE: 'table',
  HORIZONTAL_RULE: 'horizontal_rule',
  HTML_BLOCK: 'html_block',
  BLANK: 'blank'
};

/**
 * Patterns for identifying line types
 */
const PATTERNS = {
  heading: /^#{1,6}\s+/,
  fencedCodeStart: /^(`{3,}|~{3,})(\w*)?$/,
  indentedCode: /^(?: {4}|\t)/,
  blockquote: /^>\s?/,
  unorderedListItem: /^[\s]*[-*+]\s+/,
  orderedListItem: /^[\s]*\d+[.)]\s+/,
  tableRow: /^\|.*$/,
  tableSeparator: /^\|[\s:|-]+\|?$/,
  horizontalRule: /^(?:[-*_]\s*){3,}$/,
  htmlBlockStart: /^<(?:!--|!DOCTYPE|\/?\w+)/i,
  blank: /^\s*$/
};

/**
 * Block-level HTML tags per GFM spec
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
 * Determines the type of a single line
 * @param {string} line - The line to analyze
 * @returns {string} Line type identifier
 */
function getLineType(line) {
  if (PATTERNS.blank.test(line)) return 'blank';
  if (PATTERNS.heading.test(line)) return 'heading';
  if (PATTERNS.fencedCodeStart.test(line)) return 'fenced_code';
  if (PATTERNS.horizontalRule.test(line.trim())) return 'horizontal_rule';
  if (PATTERNS.blockquote.test(line)) return 'blockquote';
  if (PATTERNS.unorderedListItem.test(line)) return 'unordered_list';
  if (PATTERNS.orderedListItem.test(line)) return 'ordered_list';
  if (PATTERNS.tableRow.test(line.trim())) return 'table';
  if (PATTERNS.htmlBlockStart.test(line.trim())) return 'html_block';
  if (PATTERNS.indentedCode.test(line)) return 'indented_code';
  return 'paragraph';
}

/**
 * Checks if a line is a valid GFM table separator
 * @param {string} line - Line to check
 * @returns {boolean}
 */
function isTableSeparator(line) {
  if (!line.trim().startsWith('|')) return false;
  let content = line.trim().slice(1);
  if (content.endsWith('|')) content = content.slice(0, -1);
  const columns = content.split('|');
  return columns.every(col => /^[\s]*:?-+:?[\s]*$/.test(col));
}

/**
 * Checks if line is continuation of a list (indented content)
 * @param {string} line - Line to check
 * @returns {boolean}
 */
function isListContinuation(line) {
  return /^(?:  |\t)/.test(line) && !PATTERNS.blank.test(line);
}

/**
 * Creates a node object
 * @param {string} type - Node type
 * @param {string} content - Raw content
 * @param {number} startLine - Starting line number (0-indexed)
 * @param {number} endLine - Ending line number (0-indexed)
 * @param {Object} [meta] - Optional metadata
 * @returns {Object} Node object
 */
function createNode(type, content, startLine, endLine, meta = {}) {
  return {
    type,
    content,
    startLine,
    endLine,
    lineCount: endLine - startLine + 1,
    ...meta
  };
}

/**
 * Parses Markdown content into an array of nodes
 * @param {string} markdown - Markdown content to parse
 * @returns {Array<Object>} Array of node objects
 */
export function parseMarkdownNodes(markdown) {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const nodes = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const lineType = getLineType(line);
    
    // Skip blank lines (don't create nodes for them)
    if (lineType === 'blank') {
      i++;
      continue;
    }
    
    // Handle fenced code blocks
    if (lineType === 'fenced_code') {
      const fence = line.match(PATTERNS.fencedCodeStart)[1];
      const language = line.match(PATTERNS.fencedCodeStart)[2] || '';
      const startLine = i;
      i++;
      
      while (i < lines.length && !lines[i].startsWith(fence)) {
        i++;
      }
      
      const endLine = i < lines.length ? i : lines.length - 1;
      const content = lines.slice(startLine, endLine + 1).join('\n');
      nodes.push(createNode(NODE_TYPES.CODE_BLOCK, content, startLine, endLine, { language, fenced: true }));
      i++;
      continue;
    }
    
    // Handle headings (single line)
    if (lineType === 'heading') {
      const level = line.match(/^(#{1,6})/)[1].length;
      nodes.push(createNode(NODE_TYPES.HEADING, line, i, i, { level }));
      i++;
      continue;
    }
    
    // Handle horizontal rules (single line)
    if (lineType === 'horizontal_rule') {
      nodes.push(createNode(NODE_TYPES.HORIZONTAL_RULE, line, i, i));
      i++;
      continue;
    }
    
    // Handle blockquotes (can span multiple lines)
    if (lineType === 'blockquote') {
      const startLine = i;
      while (i < lines.length && 
             (PATTERNS.blockquote.test(lines[i]) || 
              (!PATTERNS.blank.test(lines[i]) && !getLineType(lines[i]).match(/heading|horizontal_rule|fenced_code/)))) {
        i++;
      }
      const content = lines.slice(startLine, i).join('\n');
      nodes.push(createNode(NODE_TYPES.BLOCKQUOTE, content, startLine, i - 1));
      continue;
    }
    
    // Handle unordered lists
    if (lineType === 'unordered_list') {
      const startLine = i;
      while (i < lines.length) {
        const currentLine = lines[i];
        if (PATTERNS.blank.test(currentLine)) {
          // Check if next non-blank line continues list
          let nextNonBlank = i + 1;
          while (nextNonBlank < lines.length && PATTERNS.blank.test(lines[nextNonBlank])) {
            nextNonBlank++;
          }
          if (nextNonBlank < lines.length && 
              (PATTERNS.unorderedListItem.test(lines[nextNonBlank]) || isListContinuation(lines[nextNonBlank]))) {
            i++;
            continue;
          }
          break;
        }
        if (!PATTERNS.unorderedListItem.test(currentLine) && !isListContinuation(currentLine)) {
          break;
        }
        i++;
      }
      const content = lines.slice(startLine, i).join('\n');
      nodes.push(createNode(NODE_TYPES.UNORDERED_LIST, content, startLine, i - 1));
      continue;
    }
    
    // Handle ordered lists
    if (lineType === 'ordered_list') {
      const startLine = i;
      while (i < lines.length) {
        const currentLine = lines[i];
        if (PATTERNS.blank.test(currentLine)) {
          let nextNonBlank = i + 1;
          while (nextNonBlank < lines.length && PATTERNS.blank.test(lines[nextNonBlank])) {
            nextNonBlank++;
          }
          if (nextNonBlank < lines.length && 
              (PATTERNS.orderedListItem.test(lines[nextNonBlank]) || isListContinuation(lines[nextNonBlank]))) {
            i++;
            continue;
          }
          break;
        }
        if (!PATTERNS.orderedListItem.test(currentLine) && !isListContinuation(currentLine)) {
          break;
        }
        i++;
      }
      const content = lines.slice(startLine, i).join('\n');
      nodes.push(createNode(NODE_TYPES.ORDERED_LIST, content, startLine, i - 1));
      continue;
    }
    
    // Handle tables (header + separator + rows)
    if (lineType === 'table') {
      const startLine = i;
      // Collect all contiguous table rows
      while (i < lines.length && PATTERNS.tableRow.test(lines[i].trim())) {
        i++;
      }
      const tableLines = lines.slice(startLine, i);
      
      // Validate: need at least header + separator
      const isValidTable = tableLines.length >= 2 && isTableSeparator(tableLines[1]);
      
      const content = tableLines.join('\n');
      nodes.push(createNode(NODE_TYPES.TABLE, content, startLine, i - 1, { 
        valid: isValidTable,
        rowCount: tableLines.length
      }));
      continue;
    }
    
    // Handle HTML blocks
    if (lineType === 'html_block') {
      const startLine = i;
      const firstLine = lines[i].trim();
      
      // Check for specific block types
      if (firstLine.startsWith('<!--')) {
        // Comment block - ends with -->
        while (i < lines.length && !lines[i].includes('-->')) {
          i++;
        }
        if (i < lines.length) i++;
      } else if (/^<(script|pre|style)/i.test(firstLine)) {
        // Script/style/pre - ends with closing tag
        const tag = firstLine.match(/^<(script|pre|style)/i)[1].toLowerCase();
        const closePattern = new RegExp(`</${tag}>`, 'i');
        while (i < lines.length && !closePattern.test(lines[i])) {
          i++;
        }
        if (i < lines.length) i++;
      } else {
        // Block-level HTML - ends at blank line
        while (i < lines.length && !PATTERNS.blank.test(lines[i])) {
          i++;
        }
      }
      
      const content = lines.slice(startLine, i).join('\n');
      nodes.push(createNode(NODE_TYPES.HTML_BLOCK, content, startLine, i - 1));
      continue;
    }
    
    // Handle indented code blocks
    if (lineType === 'indented_code') {
      const startLine = i;
      while (i < lines.length && 
             (PATTERNS.indentedCode.test(lines[i]) || PATTERNS.blank.test(lines[i]))) {
        i++;
      }
      // Trim trailing blank lines from code block
      let endLine = i - 1;
      while (endLine > startLine && PATTERNS.blank.test(lines[endLine])) {
        endLine--;
      }
      const content = lines.slice(startLine, endLine + 1).join('\n');
      nodes.push(createNode(NODE_TYPES.CODE_BLOCK, content, startLine, endLine, { fenced: false }));
      continue;
    }
    
    // Handle paragraphs (default - collect until blank line or block element)
    if (lineType === 'paragraph') {
      const startLine = i;
      while (i < lines.length) {
        const currentLineType = getLineType(lines[i]);
        if (currentLineType !== 'paragraph') break;
        i++;
      }
      const content = lines.slice(startLine, i).join('\n');
      nodes.push(createNode(NODE_TYPES.PARAGRAPH, content, startLine, i - 1));
      continue;
    }
    
    // Fallback - shouldn't reach here
    i++;
  }
  
  return nodes;
}

/**
 * Gets just the node types from parsed content
 * @param {string} markdown - Markdown content
 * @returns {string[]} Array of node type strings
 */
export function getNodeTypes(markdown) {
  return parseMarkdownNodes(markdown).map(node => node.type);
}

/**
 * Filters nodes by type
 * @param {string} markdown - Markdown content
 * @param {string|string[]} types - Node type(s) to filter for
 * @returns {Array<Object>} Filtered nodes
 */
export function getNodesByType(markdown, types) {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return parseMarkdownNodes(markdown).filter(node => typeSet.has(node.type));
}
