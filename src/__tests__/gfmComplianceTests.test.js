import { describe, it, expect } from 'vitest';
import { getHtmlBlockStartType, HTML_BLOCK_TYPES } from '../utils/gfmHtmlBlocks.js';

describe('GFM HTML Block Compliance Tests', () => {
  describe('Indentation Rules', () => {
    it('should accept ≤3 spaces of indentation', () => {
      const validCases = [
        '<div>',           // 0 spaces
        ' <div>',          // 1 space
        '  <div>',         // 2 spaces  
        '   <div>',        // 3 spaces
      ];

      for (const html of validCases) {
        expect(getHtmlBlockStartType(html)).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      }
    });

    it('should reject >3 spaces (code block territory)', () => {
      const invalidCases = [
        '    <div>',       // 4 spaces = code block
        '     <div>',      // 5 spaces
        '\t<div>',         // tab (usually 4+ spaces)
      ];

      for (const html of invalidCases) {
        expect(getHtmlBlockStartType(html)).toBeNull();
      }
    });

    it('should reject other characters before <', () => {
      const invalidCases = [
        '> <div>',         // blockquote
        '- <table>',       // list item
        '* <hr>',          // list item
        '1. <section>',    // ordered list
        'text<div>',       // text before
      ];

      for (const html of invalidCases) {
        expect(getHtmlBlockStartType(html)).toBeNull();
      }
    });
  });

  describe('Type 4: Case-Sensitive Declarations', () => {
    it('should accept uppercase declarations', () => {
      const validCases = [
        '<!DOCTYPE html>',
        '<!ELEMENT br EMPTY>',
        '<!ATTLIST img src CDATA #REQUIRED>',
      ];

      for (const html of validCases) {
        expect(getHtmlBlockStartType(html)).toBe(HTML_BLOCK_TYPES.DECLARATION);
      }
    });

    it('should reject lowercase declarations', () => {
      const invalidCases = [
        '<!doctype html>',  // lowercase
        '<!element br>',    // lowercase
        '<!Doctype html>',  // mixed case
      ];

      for (const html of invalidCases) {
        expect(getHtmlBlockStartType(html)).toBeNull();
      }
    });
  });

  describe('Type 6: Block-Level Tags', () => {
    it('should require complete tags', () => {
      const validCases = [
        '<div>',
        '<div class="test">',
        '<table border="1">',
        '</div>',
        '<section data-id="123">',
      ];

      for (const html of validCases) {
        expect(getHtmlBlockStartType(html)).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      }
    });

    it('should reject incomplete tags', () => {
      const invalidCases = [
        '<div',            // missing >
        '<div class=',     // incomplete attribute
        '<div class="',    // unclosed quote
      ];

      for (const html of invalidCases) {
        expect(getHtmlBlockStartType(html)).toBeNull();
      }
      
      // Note: <div></div (incomplete closing) actually starts a valid HTML block per GFM
      // The spec only cares about block START conditions, not completeness
      expect(getHtmlBlockStartType('<div></div')).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
    });

    it('should only recognize block-level tag names', () => {
      const validBlockTags = [
        '<div>',
        '<table>',
        '<section>',
        '<article>',
        '<aside>',
        '<blockquote>',
        '<h1>',
        '<h6>',
        '<p>',
        '<ul>',
        '<ol>',
        '<li>',
      ];

      for (const html of validBlockTags) {
        expect(getHtmlBlockStartType(html)).toBe(HTML_BLOCK_TYPES.BLOCK_LEVEL);
      }
    });
  });

  describe('Type 7: Other HTML Tags', () => {
    it('should recognize complete inline tags', () => {
      const validCases = [
        '<span>',
        '<a href="test">',
        '<img src="test.jpg">',
        '<em>',
        '</span>',
      ];

      for (const html of validCases) {
        expect(getHtmlBlockStartType(html)).toBe(HTML_BLOCK_TYPES.OTHER);
      }
    });

    it('should require tags to be alone on line', () => {
      const invalidCases = [
        '<span>text',      // text after tag
        'text<span>',      // text before tag
        '<span> extra',    // extra content
      ];

      for (const html of invalidCases) {
        expect(getHtmlBlockStartType(html)).toBeNull();
      }
    });
  });

  describe('All Types Integration', () => {
    it('should correctly identify all 7 HTML block types', () => {
      const testCases = [
        { html: '<script>', type: HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE },
        { html: '<style>', type: HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE },
        { html: '<pre>', type: HTML_BLOCK_TYPES.SCRIPT_STYLE_PRE },
        { html: '<!--', type: HTML_BLOCK_TYPES.COMMENT },
        { html: '<?xml version="1.0"?>', type: HTML_BLOCK_TYPES.PROCESSING_INSTRUCTION },
        { html: '<!DOCTYPE html>', type: HTML_BLOCK_TYPES.DECLARATION },
        { html: '<![CDATA[', type: HTML_BLOCK_TYPES.CDATA },
        { html: '<div>', type: HTML_BLOCK_TYPES.BLOCK_LEVEL },
        { html: '<span>', type: HTML_BLOCK_TYPES.OTHER },
      ];

      for (const { html, type } of testCases) {
        expect(getHtmlBlockStartType(html)).toBe(type);
      }
    });

    it('should handle whitespace correctly per spec', () => {
      const validWithSpaces = [
        '   <div>',        // 3 spaces OK
        '  <!--',          // 2 spaces OK
        ' <script>',       // 1 space OK
      ];

      for (const html of validWithSpaces) {
        expect(getHtmlBlockStartType(html)).not.toBeNull();
      }
    });
  });

  describe('Non-HTML Content', () => {
    it('should not detect regular markdown as HTML blocks', () => {
      const nonHtmlCases = [
        'Regular paragraph',
        '# Heading',
        '- List item',
        '> Blockquote',
        '    Code block',   // 4 spaces
        '```code```',
        '[Link](url)',
        '**Bold text**',
        'Text with < and > symbols',
        'Math: x < y > z',
        '< not a tag',
        '<<invalid>>',
      ];

      for (const text of nonHtmlCases) {
        expect(getHtmlBlockStartType(text)).toBeNull();
      }
    });
  });
});
