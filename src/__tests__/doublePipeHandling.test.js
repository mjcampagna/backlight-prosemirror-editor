// Double pipe handling tests
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { tableRowSplittingExtension } from '../extensions/tableRowSplitting.js';
import { createTableRowTextProcessingPlugin } from '../patternTextProcessingPlugin.js';

describe('Double Pipe Handling', () => {
  const markdownSystem = createMarkdownSystem([tableRowSplittingExtension], {
    textProcessing: createTableRowTextProcessingPlugin()
  });
  const { schema, mdParser, mdSerializer } = markdownSystem;

  it('should handle simple double pipe detection', () => {
    // Test the basic parsing functionality
    const markdown = `| Header 1 | Header 2 |
| Data 1 | Data 2 |`;
    
    const doc = mdParser.parse(markdown);
    expect(doc.childCount).toBeGreaterThan(0);
    
    const serialized = mdSerializer.serialize(doc);
    expect(serialized).toContain('Header 1');
    expect(serialized).toContain('Data 1');
  });

  it('should split table rows into separate paragraphs', () => {
    const markdown = `| Normal | Table |
| Content | Here |`;
    
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);
    
    // With table row splitting extension: each table row becomes a separate paragraph
    expect(doc.childCount).toBe(2);
    expect(doc.firstChild.type.name).toBe('paragraph');
    expect(doc.lastChild.type.name).toBe('paragraph');
    expect(serialized.trim()).toBe('| Normal | Table |\n| Content | Here |');
  });

  it('should handle basic table row structure', () => {
    const markdown = `| Simple | Row |`;
    
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);
    
    expect(serialized.trim()).toBe('| Simple | Row |');
  });

  it('should properly handle the user example case', () => {
    const markdown = `| Header 1 | Header 2 | Header 3 | 
| :------- | :------: | -------: | 
| Left     | Centered | Right    | 
| Item A   | Item B   | Item C   |`;
    
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);
    
    // Should split into separate paragraphs and maintain table structure
    expect(doc.childCount).toBe(4);
    
    // Check that each line is properly preserved (allowing for trailing spaces)
    expect(serialized).toContain('| Header 1 | Header 2 | Header 3 |');
    expect(serialized).toContain('| :------- | :------: | -------: |');
    expect(serialized).toContain('| Left     | Centered | Right    |');
    expect(serialized).toContain('| Item A   | Item B   | Item C   |');
    
    // Should have proper line breaks between rows (accounting for trailing spaces)
    expect(serialized).toContain('| Header 1 | Header 2 | Header 3 | \n| :------- | :------: | -------: |');
  });

  it('should handle explicit double pipes in content', () => {
    const markdown = `| Column 1 || Column 2 | Column 3 |`;
    
    const doc = mdParser.parse(markdown);
    const serialized = mdSerializer.serialize(doc);
    
    // Should preserve explicit double pipes
    expect(serialized.trim()).toBe('| Column 1 || Column 2 | Column 3 |');
  });
});
