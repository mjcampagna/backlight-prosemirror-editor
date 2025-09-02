// Pattern text processing utility tests
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { createPatternTextProcessingPlugin, createTableRowTextProcessingPlugin } from '../patternTextProcessingPlugin.js';

describe('Pattern Text Processing Plugin', () => {
  it('should throw error when pattern is missing', () => {
    expect(() => {
      createPatternTextProcessingPlugin({
        unescapeChars: ['|']
      });
    }).toThrow("'pattern' option is required");
  });

  it('should unescape characters in lines matching pattern', () => {
    const plugin = createPatternTextProcessingPlugin({
      pattern: /^\|.*\|$/,
      unescapeChars: ['|', '*']
    });

    // Create a markdown system with this text processing
    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    // Test content with escaped characters
    const markdown = '| Escaped \\| pipe and \\* asterisk |';
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    // Characters should be unescaped in table rows
    expect(serialized.trim()).toBe('| Escaped | pipe and * asterisk |');
  });

  it('should not unescape characters in non-matching lines', () => {
    const plugin = createPatternTextProcessingPlugin({
      pattern: /^\|.*\|$/,
      unescapeChars: ['*'] // Only test with asterisk since pipes aren't typically escaped in regular text
    });

    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    // Test content that doesn't match pattern
    const markdown = 'Regular paragraph with \\* escaped asterisk';
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    // Characters should remain escaped in regular paragraphs
    expect(serialized.trim()).toBe('Regular paragraph with \\* escaped asterisk');
  });

  it('should handle custom replacements in matching lines', () => {
    const plugin = createPatternTextProcessingPlugin({
      pattern: /^\|.*\|$/,
      unescapeChars: [],
      customReplacements: [
        { from: '-->', to: '→' },
        { from: 'OLD', to: 'NEW' }
      ]
    });

    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    const markdown = '| Arrow --> and OLD text |';
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    expect(serialized.trim()).toBe('| Arrow → and NEW text |');
  });

  it('should handle global unescaping alongside pattern-specific unescaping', () => {
    const plugin = createPatternTextProcessingPlugin({
      pattern: /^\|.*\|$/,
      unescapeChars: ['|'],
      globalUnescapeChars: ['~']
    });

    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    const markdown = `Regular paragraph with \\~ tilde

| Table row with \\| pipe and \\~ tilde |`;

    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    // Tildes should be unescaped everywhere, pipes only in table rows
    expect(serialized).toContain('Regular paragraph with ~ tilde');
    expect(serialized).toContain('| Table row with | pipe and ~ tilde |');
  });
});

describe('Table Row Text Processing Plugin', () => {
  it('should create plugin with default table row settings', () => {
    const plugin = createTableRowTextProcessingPlugin();
    
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('tableRowTextProcessingWithSoftBreaks');
  });

  it('should unescape table-specific characters in table rows', () => {
    const plugin = createTableRowTextProcessingPlugin();

    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    const markdown = `Regular paragraph with \\* \\_ characters.

| Table with \\| \\* \\_ characters |
| Another \\| row \\* here \\_ |`;

    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    // Regular paragraph should keep escaping for most characters (except globally unescaped ones like ~)
    expect(serialized).toContain('Regular paragraph with \\* \\_ characters.');
    
    // Table rows should have unescaped characters
    expect(serialized).toContain('| Table with | * _ characters |');
    expect(serialized).toContain('| Another | row * here _ |');
    
    // But tildes should be unescaped everywhere (global setting)
    if (serialized.includes('~')) {
      expect(serialized).not.toContain('\\~');
    }
  });

  it('should handle table rows with trailing spaces', () => {
    const plugin = createTableRowTextProcessingPlugin();

    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;

    const markdown = '| Table row with \\| escaped pipe |   ';
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);

    // Should unescape even with trailing spaces
    expect(serialized.trim()).toBe('| Table row with | escaped pipe |');
  });
});
