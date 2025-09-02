// Test double-wrapping protection
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { createTableRowTextProcessingPlugin } from '../patternTextProcessingPlugin.js';

describe('Double Wrapping Protection', () => {
  it('should prevent multiple serializer wrapping', () => {
    const plugin = createTableRowTextProcessingPlugin();
    
    // Create markdown system
    const markdownSystem = createMarkdownSystem([], {
      textProcessing: plugin
    });
    const { mdParser, mdSerializer } = markdownSystem;
    
    // Verify the serializer is patched
    expect(mdSerializer.__patternTextProcessingPatched).toBe(true);
    
    // Enhance the serializer again - should be safe
    const enhancedAgain = plugin.enhanceSerializer(mdSerializer);
    
    // Should return the same instance (already patched)
    expect(enhancedAgain).toBe(mdSerializer);
    
    // Test that functionality still works correctly with real content
    const testMarkdown = '| Test \\| table |';
    const doc = mdParser.parse(testMarkdown);
    const result = mdSerializer.serialize(doc);
    
    // Should still unescape correctly without double processing
    expect(result.trim()).toBe('| Test | table |');
  });

  it('should handle multiple plugin instances safely', () => {
    const plugin1 = createTableRowTextProcessingPlugin();
    const plugin2 = createTableRowTextProcessingPlugin({
      unescapeChars: ['*']
    });
    
    const markdownSystem1 = createMarkdownSystem([], { textProcessing: plugin1 });
    const markdownSystem2 = createMarkdownSystem([], { textProcessing: plugin2 });
    
    // Both should work independently
    expect(markdownSystem1.mdSerializer).toBeDefined();
    expect(markdownSystem2.mdSerializer).toBeDefined();
    expect(markdownSystem1.mdSerializer).not.toBe(markdownSystem2.mdSerializer);
  });
});
