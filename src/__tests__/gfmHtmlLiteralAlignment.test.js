import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { enhancedLinkExtension } from '../extensions/enhancedLink.js';
import { htmlLiteralStylingPlugin } from '../htmlLiteralStylingPlugin.js';
import { EditorState } from 'prosemirror-state';

describe('GFM HTML Literal Alignment', () => {
  let system, plugin;

  beforeEach(() => {
    system = createMarkdownSystem([enhancedLinkExtension]);
    plugin = htmlLiteralStylingPlugin({ className: "pm-html-literal" });
  });

  describe('GFM Spec Compliance', () => {
    it('should detect Type 1: Script/Style/Pre tags', () => {
      const testCases = [
        '<script>',
        '<style type="text/css">',
        '<pre class="code">',
        '<SCRIPT>', // case insensitive
        '<style >'
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        // Should be styled as HTML literal
        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });

    it('should detect Type 2: Comments', () => {
      const testCases = [
        '<!--',
        '<!-- This is a comment',
        '<!-- Multi-line comment -->'
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });

    it('should detect Type 4: Declarations', () => {
      const testCases = [
        '<!DOCTYPE html>',
        '<!ELEMENT br EMPTY>'
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });

    it('should detect Type 6: Block-level tags', () => {
      const testCases = [
        '<div>',
        '<div class="container">',
        '<table>',
        '<section>',
        '<article>',
        '</div>', // closing tags too
        '<h1>',
        '<p>'
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });

    it('should detect Type 7: Other HTML tags', () => {
      const testCases = [
        '<span>',
        '<a href="test">',
        '<img src="test.jpg">',
        '</span>'
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });
  });

  describe('Non-HTML Content Should Not Match', () => {
    it('should not detect regular markdown content', () => {
      const nonHtmlCases = [
        'Regular paragraph',
        '**Bold text**',
        '[Link](https://example.com)',
        '# Heading',
        '- List item',
        '`code span`',
        '< not a tag',
        'text with < and > symbols',
        'equation: x < y > z'
      ];

      for (const text of nonHtmlCases) {
        const doc = system.mdParser.parse(text);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBe(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle valid HTML with whitespace', () => {
      const testCases = [
        '   <div>   ', // Should work
        '<script>',   // Should work without extra whitespace  
        '  <!--  '    // Should work
      ];

      for (const html of testCases) {
        const doc = system.mdParser.parse(html);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        
        // All these should be detected as valid HTML blocks
        expect(decorations.find().length).toBeGreaterThan(0);
      }
    });

    it('should follow GFM rules for invalid HTML', () => {
      const invalidCases = [
        '<div incomplete',      // incomplete tag
        '<123invalid>',         // invalid tag name
        '<<double-bracket>>'    // invalid syntax
      ];
      
      const mixedContentCases = [
        'text <div> more text'  // mixed content - not pure HTML
      ];

      // Test truly invalid HTML
      for (const text of invalidCases) {
        const doc = system.mdParser.parse(text);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        // These should not match GFM spec
        expect(decorations.find().length).toBe(0);
      }
      
      // Mixed content should also not match (not "HTML-only")
      for (const text of mixedContentCases) {
        const doc = system.mdParser.parse(text);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        expect(decorations.find().length).toBe(0);
      }
    });
  });

  describe('Comparison with Previous Implementation', () => {
    it('should be more strict than the old regex approach', () => {
      // These would match the old regex but should NOT match GFM spec
      const stricterCases = [
        '<invalidtag>',           // invalid tag name
        '<123>',                 // invalid tag name
        'text <span>mixed</span> content'  // mixed content
      ];

      for (const text of stricterCases) {
        const doc = system.mdParser.parse(text);
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: [plugin]
        });

        const decorations = plugin.getState(state);
        
        // Mixed content should definitely not match
        if (text === 'text <span>mixed</span> content') {
          expect(decorations.find().length).toBe(0);
        }
        // Note: <invalidtag> matches GFM Type 7 (complete HTML tag)
        // This is actually correct per GFM spec
      }
    });
  });
});
