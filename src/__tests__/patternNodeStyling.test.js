// Pattern node styling utility tests
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { schema as baseSchema } from 'prosemirror-markdown';
import { createPatternNodeStylingPlugin, createTableRowStylingPlugin } from '../patternNodeStylingPlugin.js';

describe('Pattern Node Styling Plugin', () => {
  let schema;

  beforeEach(() => {
    schema = baseSchema;
  });

  it('should create a plugin with basic configuration', () => {
    const pattern = /^test/;
    const className = 'test-class';
    
    const plugin = createPatternNodeStylingPlugin({
      pattern,
      className
    });
    
    expect(plugin).toBeDefined();
    expect(plugin.key).toBeDefined();
  });

  it('should throw error when required options are missing', () => {
    expect(() => {
      createPatternNodeStylingPlugin({});
    }).toThrow("Both 'pattern' and 'className' options are required");
    
    expect(() => {
      createPatternNodeStylingPlugin({ pattern: /test/ });
    }).toThrow("Both 'pattern' and 'className' options are required");
    
    expect(() => {
      createPatternNodeStylingPlugin({ className: 'test' });
    }).toThrow("Both 'pattern' and 'className' options are required");
  });

  it('should create table row styling plugin with defaults', () => {
    const plugin = createTableRowStylingPlugin();
    
    expect(plugin).toBeDefined();
    expect(plugin.key).toBeDefined();
  });

  it('should create table row styling plugin with custom options', () => {
    const plugin = createTableRowStylingPlugin({
      className: 'custom-table-row',
      pluginKey: 'custom-plugin'
    });
    
    expect(plugin).toBeDefined();
    expect(plugin.key).toBeDefined();
  });

  it('should detect table row patterns correctly', () => {
    const tableRowPattern = /^\|.*\|\s*$/;
    
    // Test cases that should match
    const shouldMatch = [
      '| Header |',
      '| Header | Column 2 |',
      '| Data | More Data |  ',
      '|Simple|',
      '| With spaces and content |   '
    ];
    
    // Test cases that should NOT match
    const shouldNotMatch = [
      'Regular paragraph',
      '| Missing end pipe',
      'Missing start pipe |',
      '|| Empty cells',
      'Not | a | table | at all'
    ];
    
    shouldMatch.forEach(text => {
      expect(tableRowPattern.test(text)).toBe(true);
    });
    
    shouldNotMatch.forEach(text => {
      expect(tableRowPattern.test(text)).toBe(false);
    });
  });
});
