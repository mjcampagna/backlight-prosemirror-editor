// Debug original tilde behavior (before my changes)
import { createMarkdownSystem } from './src/markdownSystem.js';
import { enhancedLinkExtension } from './src/extensions/enhancedLink.js';
import { tableRowSplittingExtension } from './src/extensions/tableRowSplitting.js';
import { createTableRowTextProcessingPlugin } from './src/patternTextProcessingPlugin.js';

// Original system (how it was before my changes)
const originalSystem = createMarkdownSystem([enhancedLinkExtension, tableRowSplittingExtension], {
  textProcessing: createTableRowTextProcessingPlugin() // Original config
});

const testCases = [
  'Single \\~ tilde test',
  'Double \\~\\~ tilde test',
  '~~Normal strikethrough~~',
  'Mixed \\~ and ~~strike~~ test'
];

console.log('=== ORIGINAL SYSTEM (before any changes) ===');
testCases.forEach(test => {
  console.log(`Input:  ${test}`);
  const doc = originalSystem.mdParser.parse(test);
  const result = originalSystem.mdSerializer.serialize(doc);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
});
