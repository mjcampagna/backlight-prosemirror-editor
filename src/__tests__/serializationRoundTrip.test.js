import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';

describe('Serialization Round-Trip Tests', () => {
  let system;

  beforeEach(() => {
    system = createMarkdownSystem([]);
  });

  describe('Markdown → ProseMirror → Markdown', () => {
    it('should preserve basic markdown formatting', () => {
      const markdown = `# Main Heading

This is a paragraph with **bold** and *italic* text.

## Subheading

- List item 1
- List item 2
- List item with [a link](https://example.com)

> This is a blockquote
> with multiple lines

\`\`\`javascript
const code = "block";
\`\`\`

Regular paragraph with \`inline code\`.`;

      const doc = system.mdParser.parse(markdown);
      const serialized = system.mdSerializer.serialize(doc);

      // Should preserve all major elements
      expect(serialized).toContain('# Main Heading');
      expect(serialized).toContain('**bold**');
      expect(serialized).toContain('*italic*');
      expect(serialized).toContain('## Subheading');
      expect(serialized).toContain('* List item 1'); // ProseMirror uses * for bullets
      expect(serialized).toContain('[a link](https://example.com)');
      expect(serialized).toContain('> This is a blockquote');
      expect(serialized).toContain('```javascript');
      expect(serialized).toContain('`inline code`');
    });

    it('should handle edge cases and special characters', () => {
      const markdown = `Text with special chars: * _ \\ [ ] ( )

| Table | With | Pipes |
|-------|------|-------|
| Data  | More | Info  |

HTML content: <div class="test">content</div>

Escaped characters: \\* \\_ \\[ \\]

Multiple

blank

lines`;

      const doc = system.mdParser.parse(markdown);
      const serialized = system.mdSerializer.serialize(doc);

      // Should preserve special characters and structure (some get escaped)
      expect(serialized).toContain('\\* \\_ \\\\ \\[ \\] ( )');
      expect(serialized).toContain('| Table | With | Pipes |');
      expect(serialized).toContain('<div class="test">content</div>');
      expect(serialized).toContain('\\* \\_ \\[ \\]');
    });

    it('should handle empty and minimal content', () => {
      const testCases = [
        '',
        ' ',
        '\n',
        '# Heading',
        'Single paragraph',
        '**bold**',
        '[link](url)'
      ];

      for (const markdown of testCases) {
        expect(() => {
          const doc = system.mdParser.parse(markdown);
          const serialized = system.mdSerializer.serialize(doc);
          // Should not throw and should produce valid output
          expect(typeof serialized).toBe('string');
        }).not.toThrow();
      }
    });
  });

  describe('Complex Document Structure', () => {
    it('should preserve nested structures correctly', () => {
      const markdown = `# Document

1. First ordered item
   - Nested bullet
   - Another nested item
     
2. Second ordered item
   > Nested blockquote
   > Second line
   
3. Third item with code:
   \`\`\`
   nested code block
   \`\`\`

Final paragraph.`;

      const doc = system.mdParser.parse(markdown);
      const serialized = system.mdSerializer.serialize(doc);

      expect(serialized).toContain('1. First ordered item');
      expect(serialized).toContain('* Nested bullet'); // ProseMirror uses * for bullets
      expect(serialized).toContain('2. Second ordered item');
      expect(serialized).toContain('> Nested blockquote');
      expect(serialized).toContain('3. Third item with code:');
      expect(serialized).toContain('```');
      expect(serialized).toContain('nested code block');
    });

    it('should handle malformed markdown gracefully', () => {
      const malformedCases = [
        '# Heading without content\n\n',
        '**unclosed bold text',
        '[broken link](incomplete',
        '| incomplete | table',
        '```\nunclosed code block',
        '> unclosed blockquote'
      ];

      for (const markdown of malformedCases) {
        expect(() => {
          const doc = system.mdParser.parse(markdown);
          const serialized = system.mdSerializer.serialize(doc);
          expect(typeof serialized).toBe('string');
        }).not.toThrow();
      }
    });
  });

  describe('Serializer Error Handling', () => {
    it('should handle serialization errors gracefully with safeSerialize', async () => {
      const { safeSerialize } = await import('../index.js');
      
      // Mock a serializer that throws
      const badSerializer = {
        serialize: () => { throw new Error('Serialization failed'); }
      };
      
      const mockDoc = { textContent: 'fallback content' };
      
      const result = safeSerialize(badSerializer, mockDoc);
      expect(result).toBe('fallback content');
    });

    it('should use normal serialization when no errors occur', async () => {
      const { safeSerialize } = await import('../index.js');
      
      const goodSerializer = {
        serialize: (doc) => `serialized: ${doc.content}`
      };
      
      const mockDoc = { content: 'test content' };
      
      const result = safeSerialize(goodSerializer, mockDoc);
      expect(result).toBe('serialized: test content');
    });
  });

  describe('Parser Edge Cases', () => {
    it('should handle various line ending formats', () => {
      const lineEndingVariants = [
        'Line 1\nLine 2',      // LF
        'Line 1\r\nLine 2',    // CRLF  
        'Line 1\rLine 2'       // CR (rare)
      ];

      for (const markdown of lineEndingVariants) {
        expect(() => {
          const doc = system.mdParser.parse(markdown);
          expect(doc.childCount).toBeGreaterThan(0);
        }).not.toThrow();
      }
    });

    it('should handle very long content', () => {
      const longContent = 'Very long paragraph. '.repeat(1000);
      const markdown = `# Heading\n\n${longContent}\n\n## Another heading`;

      expect(() => {
        const doc = system.mdParser.parse(markdown);
        const serialized = system.mdSerializer.serialize(doc);
        expect(serialized).toContain('# Heading');
        expect(serialized).toContain('## Another heading');
      }).not.toThrow();
    });
  });
});
