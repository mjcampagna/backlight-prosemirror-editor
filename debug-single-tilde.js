// Debug single tilde escaping behavior
import { createMarkdownSystem } from './src/markdownSystem.js';
import { enhancedLinkExtension } from './src/extensions/enhancedLink.js';
import { tableRowSplittingExtension } from './src/extensions/tableRowSplitting.js';
import { tagfilterExtension, createTagfilterTextProcessingPlugin } from './src/extensions/tagfilter.js';
import { createTableRowTextProcessingPlugin } from './src/patternTextProcessingPlugin.js';

// Current system (after my changes)
const tableRowPlugin = createTableRowTextProcessingPlugin();
const tagfilterPlugin = createTagfilterTextProcessingPlugin();

const doubleTildePlugin = {
  name: "doubleTildeUnescaping",
  enhanceSerializer(mdSerializer) {
    const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
    mdSerializer.serialize = function(content, options) {
      let result = originalSerialize(content, options);
      result = result.replace(/\\~\\~/g, '~~');
      result = result.replace(/\\\\~~/g, '~~');
      return result;
    };
    return mdSerializer;
  }
};

const combinedTextProcessing = {
  name: "combinedTextProcessing",  
  enhanceSerializer(mdSerializer) {
    let enhanced = tableRowPlugin.enhanceSerializer(mdSerializer);
    enhanced = doubleTildePlugin.enhanceSerializer(enhanced);
    enhanced = tagfilterPlugin.enhanceSerializer(enhanced);
    return enhanced;
  }
};

const currentSystem = createMarkdownSystem([
  enhancedLinkExtension, 
  tableRowSplittingExtension, 
  tagfilterExtension
], { 
  textProcessing: combinedTextProcessing 
});

const testCases = [
  'Single \\~ tilde test',
  'Double \\~\\~ tilde test', 
  'Mixed \\~ and \\~\\~strike\\~\\~ test'
];

console.log('=== CURRENT SYSTEM BEHAVIOR ===');
testCases.forEach(test => {
  console.log(`Input:  ${test}`);
  const doc = currentSystem.mdParser.parse(test);
  const result = currentSystem.mdSerializer.serialize(doc);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
});
