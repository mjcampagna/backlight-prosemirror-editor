import { describe, it, expect } from 'vitest';
import { 
  getHtmlBlockStartType, 
  isHtmlBlockEnd, 
  findHtmlBlocks, 
  isLineInHtmlBlock,
  HTML_BLOCK_TYPES 
} from '../utils/gfmHtmlBlocks.js';

describe('GFM HTML Block Detection', () => {
  describe('HTML Block Start Detection', () => {
    it('should detect script/style/pre tags (type 1)', () => {
      expect(getHtmlBlockStartType('<script>')).toBe(HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE);
      expect(getHtmlBlockStartType('<style type="text/css">')).toBe(HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE);
      expect(getHtmlBlockStartType('<pre class="code">')).toBe(HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE);
    });

    it('should detect comments (type 2)', () => {
      expect(getHtmlBlockStartType('<!--')).toBe(HTML_BLOCK_TYPES.COMMENT);
      expect(getHtmlBlockStartType('<!-- This is a comment')).toBe(HTML_BLOCK_TYPES.COMMENT);
    });

    it('should detect processing instructions (type 3)', () => {
      expect(getHtmlBlockStartType('<?php')).toBe(HTML_BLOCK_TYPES.PROCESSING_INSTRUCTION);
      expect(getHtmlBlockStartType('<?xml version="1.0"?>')).toBe(HTML_BLOCK_TYPES.PROCESSING_INSTRUCTION);
    });

    it('should detect declarations (type 4)', () => {
      expect(getHtmlBlockStartType('<!DOCTYPE html>')).toBe(HTML_BLOCK_TYPES.DECLARATION);
      expect(getHtmlBlockStartType('<!ELEMENT br EMPTY>')).toBe(HTML_BLOCK_TYPES.DECLARATION);
    });

    it('should detect CDATA sections (type 5)', () => {
      expect(getHtmlBlockStartType('<![CDATA[')).toBe(HTML_BLOCK_TYPES.CDATA);
    });

    it('should detect block-level tags (type 6)', () => {
      expect(getHtmlBlockStartType('<div>')).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      expect(getHtmlBlockStartType('<div class="container">')).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      expect(getHtmlBlockStartType('<table>')).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      expect(getHtmlBlockStartType('</div>')).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
    });

    it('should detect other HTML tags (type 7)', () => {
      expect(getHtmlBlockStartType('<span>')).toBe(HTML_BLOCK_TYPES.OTHER);
      expect(getHtmlBlockStartType('<a href="test">')).toBe(HTML_BLOCK_TYPES.OTHER);
      expect(getHtmlBlockStartType('</span>')).toBe(HTML_BLOCK_TYPES.OTHER);
    });

    it('should not detect non-HTML content', () => {
      expect(getHtmlBlockStartType('Regular text')).toBeNull();
      expect(getHtmlBlockStartType('< not a tag')).toBeNull();
      expect(getHtmlBlockStartType('<<script>>')).toBeNull();
    });
  });

  describe('HTML Block End Detection', () => {
    it('should detect script/style/pre endings', () => {
      expect(isHtmlBlockEnd('</script>', HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE)).toBe(true);
      expect(isHtmlBlockEnd('Some content </style>', HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE)).toBe(true);
      expect(isHtmlBlockEnd('</div>', HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE)).toBe(false);
    });

    it('should detect comment endings', () => {
      expect(isHtmlBlockEnd('-->', HTML_BLOCK_TYPES.COMMENT)).toBe(true);
      expect(isHtmlBlockEnd('Some text --> end', HTML_BLOCK_TYPES.COMMENT)).toBe(true);
      expect(isHtmlBlockEnd('<!-- Still in comment', HTML_BLOCK_TYPES.COMMENT)).toBe(false);
    });
  });

  describe('HTML Block Range Finding', () => {
    it('should find simple HTML blocks', () => {
      const lines = [
        'Regular paragraph',
        '<div>',
        'Content inside',
        '</div>',
        '',
        'Another paragraph'
      ];
      
      const blocks = findHtmlBlocks(lines);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        start: 1,
        end: 3, 
        type: HTML_BLOCK_TYPES.BLOCK_LEVEL
      });
    });

    it('should find script blocks that span multiple lines', () => {
      const lines = [
        'Text before',
        '<script>',
        'var x = 1;',
        'console.log(x);',
        '</script>',
        'Text after'
      ];
      
      const blocks = findHtmlBlocks(lines);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        start: 1,
        end: 4,
        type: HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE
      });
    });

    it('should find comment blocks', () => {
      const lines = [
        'Before',
        '<!-- Multi-line',
        'comment here',
        'ends here -->',
        'After'
      ];
      
      const blocks = findHtmlBlocks(lines);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe(HTML_BLOCK_TYPES.COMMENT);
    });
  });

  describe('Line Position Detection', () => {
    it('should correctly identify lines inside HTML blocks', () => {
      const lines = [
        'Regular text',
        '<div class="container">',
        'Content inside div',
        'More content',  
        '</div>',
        '',
        'Regular text after'
      ];
      
      expect(isLineInHtmlBlock(0, lines)).toBeNull(); // Regular text
      expect(isLineInHtmlBlock(1, lines)).toBeTruthy(); // <div>
      expect(isLineInHtmlBlock(2, lines)).toBeTruthy(); // Content inside
      expect(isLineInHtmlBlock(3, lines)).toBeTruthy(); // More content
      expect(isLineInHtmlBlock(4, lines)).toBeTruthy(); // </div>
      expect(isLineInHtmlBlock(5, lines)).toBeNull(); // Blank line
      expect(isLineInHtmlBlock(6, lines)).toBeNull(); // Regular text after
    });
  });
});
