// Debug escaping behavior
import { createMarkdownSystem } from './src/markdownSystem.js';
import { gfmCompliantEscapingExtension, createGfmCompliantEscapingPlugin } from './src/extensions/gfmCompliantEscaping.js';

// Create a disabled text processing plugin to override default
const disabledPlugin = {
  name: "disabled",
  enhanceSerializer(serializer) { return serializer; }
};

// Test simple case
const plugin = createGfmCompliantEscapingPlugin();
const system = createMarkdownSystem([gfmCompliantEscapingExtension], {
  textProcessing: disabledPlugin
});

const testCases = [
  'Regular text with \\| pipe',
  '\\~ tilde test', 
  'Regular \\* asterisk',
  `| Table \\| with pipe |
| --- |
| Data |`,
  'Line starting with \\| but not a table'
];

testCases.forEach(test => {
  console.log(`Input: ${test}`);
  const doc = system.mdParser.parse(test);
  console.log(`Parsed doc:`, JSON.stringify(doc.toJSON(), null, 2));
  const result = system.mdSerializer.serialize(doc);
  console.log(`Output: ${result.trim()}`);
  console.log('---');
});
