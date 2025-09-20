// Debug existing table parsing to see if we broke anything
import { createMarkdownSystem } from './src/markdownSystem.js';
import { enhancedLinkExtension } from './src/extensions/enhancedLink.js';
import { tableRowSplittingExtension } from './src/extensions/tableRowSplitting.js';
import { createTableRowTextProcessingPlugin } from './src/patternTextProcessingPlugin.js';

console.log('=== ORIGINAL TABLE SYSTEM (before my changes) ===');
const originalSystem = createMarkdownSystem([enhancedLinkExtension, tableRowSplittingExtension], {
  textProcessing: createTableRowTextProcessingPlugin()
});

console.log('=== NEW GFM SYSTEM (with my changes) ===');
import { tagfilterExtension, createTagfilterTextProcessingPlugin } from './src/extensions/tagfilter.js';
import { gfmCompliantEscapingExtension, createGfmCompliantEscapingPlugin } from './src/extensions/gfmCompliantEscaping.js';

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

// Create a simple double tilde unescaping plugin
const doubleTildePlugin = {
  name: "doubleTildeUnescaping",
  enhanceSerializer(mdSerializer) {
    const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
    mdSerializer.serialize = function(content, options) {
      let result = originalSerialize(content, options);
      
      // Global double tilde unescaping for strikethrough
      result = result.replace(/\\~\\~/g, '~~');
      result = result.replace(/\\\\~~/g, '~~');
      
      return result;
    };
    return mdSerializer;
  }
};

const newCombinedTextProcessing = {
  name: "combinedTextProcessing",  
  enhanceSerializer(mdSerializer) {
    // Apply original table processing, then double tilde unescaping, then tagfilter
    let enhanced = createTableRowTextProcessingPlugin().enhanceSerializer(mdSerializer);
    enhanced = doubleTildePlugin.enhanceSerializer(enhanced);
    enhanced = tagfilterPlugin.enhanceSerializer(enhanced);
    return enhanced;
  }
};

const newSystem = createMarkdownSystem([
  enhancedLinkExtension, 
  tableRowSplittingExtension, 
  tagfilterExtension
], { 
  textProcessing: newCombinedTextProcessing 
});

// Test cases that were previously working
const testCases = [
  // Valid GFM table
  `| Table \\| with pipe | Column |
| --- | --- |
| Data \\* row | Content |`,
  
  // Single line with pipes (not a valid GFM table)
  `| Table \\| with pipe |`,
  
  // Double tilde test
  `Text with \\~\\~strikethrough\\~\\~ content`,
  
  // Mixed content
  `Regular \\* text

| Valid \\| table | Data |
| --- | --- |

More \\* text`
];

testCases.forEach((test, i) => {
  console.log(`\n=== Test Case ${i + 1} ===`);
  console.log('Input:', test.split('\n')[0] + '...');
  
  console.log('\nORIGINAL SYSTEM:');
  const originalDoc = originalSystem.mdParser.parse(test);
  const originalResult = originalSystem.mdSerializer.serialize(originalDoc);
  console.log('Output:', originalResult.trim());
  
  console.log('\nNEW SYSTEM:');
  const newDoc = newSystem.mdParser.parse(test);
  const newResult = newSystem.mdSerializer.serialize(newDoc);
  console.log('Output:', newResult.trim());
  
  console.log('\nDIFFERENCE:', originalResult === newResult ? 'SAME ✅' : 'CHANGED ⚠️');
});
