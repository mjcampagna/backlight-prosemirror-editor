// Debug double tilde unescaping
import { createMarkdownSystem } from './src/markdownSystem.js';
import { enhancedLinkExtension } from './src/extensions/enhancedLink.js';
import { tableRowSplittingExtension } from './src/extensions/tableRowSplitting.js';
import { tagfilterExtension, createTagfilterTextProcessingPlugin } from './src/extensions/tagfilter.js';
import { gfmCompliantEscapingExtension, createGfmCompliantEscapingPlugin } from './src/extensions/gfmCompliantEscaping.js';

// Create system with GFM-compliant escaping that includes double tilde unescaping
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

const markdownSystem = createMarkdownSystem([
  enhancedLinkExtension, 
  tableRowSplittingExtension, 
  tagfilterExtension, 
  gfmCompliantEscapingExtension
], { 
  textProcessing: combinedTextProcessing 
});

const testCases = [
  'Simple \\~\\~strikethrough\\~\\~ test',
  'Single \\~ vs double \\~\\~strike\\~\\~',
  `| Table \\| with | \\~\\~strike\\~\\~ |
| --- | --- |
| Data | Regular ~~strike~~ |`
];

testCases.forEach((test, i) => {
  console.log(`\nTest ${i + 1}: ${test.split('\n')[0]}...`);
  const doc = markdownSystem.mdParser.parse(test);
  const result = markdownSystem.mdSerializer.serialize(doc);
  console.log(`Result: ${result.trim()}`);
  console.log('---');
});
