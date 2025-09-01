const fs = require('fs');

try {
  // Read ProseMirror base styles
  const prosemirrorCSS = fs.readFileSync('node_modules/prosemirror-view/style/prosemirror.css', 'utf8');
  
  // Read our baseline styles
  let baselineCSS = fs.readFileSync('src/styles/baseline.css', 'utf8');
  
  // Remove the @import line
  baselineCSS = baselineCSS.replace("@import 'prosemirror-view/style/prosemirror.css';\n\n", '');
  
  // Combine them
  const combined = prosemirrorCSS + '\n' + baselineCSS;
  
  // Write to dist
  fs.writeFileSync('dist/prosemirror-bundle.css', combined);
  
  console.log('✓ CSS bundle created: dist/prosemirror-bundle.css');
} catch (error) {
  console.error('CSS build failed:', error);
  process.exit(1);
}
