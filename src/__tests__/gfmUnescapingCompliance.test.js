// Tests to validate that custom character unescaping doesn't break GFM compliance
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { enhancedLinkExtension } from '../extensions/enhancedLink.js';
import { tableRowSplittingExtension } from '../extensions/tableRowSplitting.js';
import { tagfilterExtension, createTagfilterTextProcessingPlugin } from '../extensions/tagfilter.js';
import { gfmCompliantEscapingExtension, createGfmCompliantEscapingPlugin } from '../extensions/gfmCompliantEscaping.js';

describe('GFM Unescaping Compliance Tests', () => {
  let markdownSystem;

  beforeEach(() => {
    // Create system exactly as used in the main application
    const gfmEscapingPlugin = createGfmCompliantEscapingPlugin();
    const tagfilterPlugin = createTagfilterTextProcessingPlugin();
    
    const combinedTextProcessing = {
      name: "combinedTextProcessing",
      enhanceSerializer(mdSerializer) {
        let enhanced = gfmEscapingPlugin.enhanceSerializer(mdSerializer);
        enhanced = tagfilterPlugin.enhanceSerializer(enhanced);
        return enhanced;
      }
    };

    markdownSystem = createMarkdownSystem(
      [enhancedLinkExtension, tableRowSplittingExtension, tagfilterExtension, gfmCompliantEscapingExtension], 
      { textProcessing: combinedTextProcessing }
    );
  });

  describe('GFM Backslash Escaping Rules', () => {
    it('should preserve escaped asterisks in regular text (GFM spec)', () => {
      const markdown = `\\*not emphasized\\*`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped in regular text since * is meaningful
      expect(result.trim()).toBe('\\*not emphasized\\*');
    });

    it('should preserve escaped underscores in regular text (GFM spec)', () => {
      const markdown = `\\_not emphasized\\_`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped in regular text since _ is meaningful
      expect(result.trim()).toBe('\\_not emphasized\\_');
    });

    it('should preserve escaped pipes in regular text (GFM spec)', () => {
      const markdown = `Regular text with escaped \\| pipe`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped in regular text since | could be table-related
      expect(result.trim()).toBe('Regular text with escaped \\| pipe');
    });

    it('should preserve escaped tildes in regular text (GFM compliant)', () => {
      const markdown = `Text with escaped \\~ tilde`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should preserve escapes in regular text to not break strikethrough
      expect(result.trim()).toBe('Text with escaped \\~ tilde');
    });
  });

  describe('Table Row Unescaping (Context-Specific)', () => {
    it('should unescape pipes in table rows only', () => {
      const markdown = `| Table \\| with pipe | Column |
| Regular text with \\| pipe`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Pipes should be unescaped in table rows
      expect(result).toContain('| Table | with pipe | Column |');
      // But should remain escaped in regular text  
      expect(result).toContain('| Regular text with \\| pipe');
    });

    it('should unescape asterisks in table rows only', () => {
      const markdown = `| Table \\* with asterisk |
Regular \\*text\\* should remain escaped.`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Asterisks should be unescaped in table rows
      expect(result).toContain('| Table * with asterisk |');
      // But should remain escaped in regular text
      expect(result).toContain('Regular \\*text\\* should remain escaped.');
    });

    it('should unescape underscores in table rows only', () => {
      const markdown = `| Table \\_ with underscore |
Regular \\_text\\_ should remain escaped.`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Underscores should be unescaped in table rows
      expect(result).toContain('| Table _ with underscore |');
      // But should remain escaped in regular text
      expect(result).toContain('Regular \\_text\\_ should remain escaped.');
    });
  });

  describe('GFM Special Cases', () => {
    it('should handle escaped hash symbols correctly', () => {
      const markdown = `\\# Not a heading`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped since # is meaningful
      expect(result.trim()).toBe('\\# Not a heading');
    });

    it('should handle escaped brackets correctly', () => {
      const markdown = `\\[not a link\\](/url)`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped since [] is meaningful
      expect(result.trim()).toBe('\\[not a link\\](/url)');
    });

    it('should handle escaped backticks correctly', () => {
      const markdown = '\\`not code\\`';
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped since ` is meaningful
      expect(result.trim()).toBe('\\`not code\\`');
    });

    it('should handle escaped list markers correctly', () => {
      const markdown = `1\\. Not a list item
\\* Not a list item
\\+ Not a list item
\\- Not a list item`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Should remain escaped since these are meaningful
      expect(result).toContain('1\\. Not a list item');
      expect(result).toContain('\\* Not a list item');
      expect(result).toContain('\\+ Not a list item');  
      expect(result).toContain('\\- Not a list item');
    });
  });

  describe('Double Escaping Edge Cases', () => {
    it('should handle double-escaped characters correctly', () => {
      const markdown = `\\\\*should show backslash and asterisk*`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Double backslash should escape the backslash, making * active for emphasis
      expect(result.trim()).toBe('\\\\*should show backslash and asterisk*');
    });

    it('should handle double-escaped pipes in table rows', () => {
      const markdown = `| Table \\\\| with escaped backslash |`;
      const doc = markdownSystem.mdParser.parse(markdown);  
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // The pattern processing should handle this correctly
      expect(result).toContain('| Table \\| with escaped backslash |');
    });
  });

  describe('Hard Line Break Preservation', () => {
    it('should preserve backslash line breaks (GFM spec)', () => {
      const markdown = `Line one\\
Line two`;
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Hard line breaks should be preserved
      expect(result).toContain('Line one\\');
      expect(result).toContain('Line two');
    });
  });

  describe('Context-Sensitive Unescaping Validation', () => {
    it('should not break emphasis when unescaping in wrong contexts', () => {
      const markdown = `Regular **bold** and *italic* text.
| Table \\* row \\_ with | escaped chars |`;
      
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // Emphasis should be preserved in regular text
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      
      // But unescaped in table rows
      expect(result).toContain('| Table * row _ with | escaped chars |');
    });

    it('should maintain GFM table structure with mixed escaping', () => {
      const markdown = `| Header \\| 1 | Header \\* 2 | Header \\_ 3 |
| :----- | :-----: | -----: |
| Cell \\| A | Cell \\* B | Cell \\_ C |`;
      
      const doc = markdownSystem.mdParser.parse(markdown);
      const result = markdownSystem.mdSerializer.serialize(doc);
      
      // All table content should have unescaped characters
      expect(result).toContain('| Header | 1 | Header * 2 | Header _ 3 |');
      expect(result).toContain('| Cell | A | Cell * B | Cell _ C |');
    });
  });
});
