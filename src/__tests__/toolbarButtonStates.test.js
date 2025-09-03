// Test toolbar button active states with HR selection
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { isBlockActive } from '../utils/selection.js';

describe('Toolbar Button States', () => {
  const markdownSystem = createMarkdownSystem([]);
  const { schema, mdParser } = markdownSystem;

  it('should not activate list buttons when HR is selected', () => {
    // Create a document with HR
    const doc = mdParser.parse(`Some text

---

More text`);
    
    // Find the HR node position
    let hrPos = -1;
    doc.descendants((node, pos) => {
      if (node.type.name === 'horizontal_rule') {
        hrPos = pos;
        return false;
      }
    });
    
    // Create mock selection on HR
    const mockSelection = {
      from: hrPos,
      to: hrPos + 1,
    };
    
    const mockState = {
      selection: mockSelection,
      doc: doc,
      schema: schema
    };
    
    // Test that block buttons are not active when HR is selected
    if (schema.nodes.bullet_list) {
      expect(isBlockActive(mockState, schema.nodes.bullet_list)).toBe(false);
    }
    
    if (schema.nodes.ordered_list) {
      expect(isBlockActive(mockState, schema.nodes.ordered_list)).toBe(false);
    }
    
    if (schema.nodes.blockquote) {
      expect(isBlockActive(mockState, schema.nodes.blockquote)).toBe(false);
    }
    
    if (schema.nodes.code_block) {
      expect(isBlockActive(mockState, schema.nodes.code_block)).toBe(false);
    }
    
    // HR itself should be active when selected
    if (schema.nodes.horizontal_rule) {
      expect(isBlockActive(mockState, schema.nodes.horizontal_rule)).toBe(true);
    }
  });

  it('should properly detect active states for regular content', () => {
    // Test normal paragraph - should not be active for any special block types
    const doc = mdParser.parse('Regular paragraph content');
    
    const mockState = {
      selection: { from: 0, to: doc.content.size },
      doc: doc,
      schema: schema
    };
    
    // Regular paragraph should not activate list/blockquote/code buttons
    expect(isBlockActive(mockState, schema.nodes.bullet_list)).toBe(false);
    expect(isBlockActive(mockState, schema.nodes.blockquote)).toBe(false);
    expect(isBlockActive(mockState, schema.nodes.code_block)).toBe(false);
    
    // Should be active for paragraph type
    expect(isBlockActive(mockState, schema.nodes.paragraph)).toBe(true);
  });

  it('should handle empty selections correctly', () => {
    const doc = mdParser.parse('Test content');
    
    const mockState = {
      selection: { from: 1, to: 1 }, // Empty selection
      doc: doc,
      schema: schema
    };
    
    // Empty selection in paragraph should not activate block buttons inappropriately
    expect(isBlockActive(mockState, schema.nodes.blockquote)).toBe(false);
    expect(isBlockActive(mockState, schema.nodes.horizontal_rule)).toBe(false);
  });
});
