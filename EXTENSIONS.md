# Extension System Usage

The `markdownSystem.js` provides a powerful extension system for adding custom markdown functionality to the ProseMirror editor.

## How to Add Extensions

1. Create an extension file in `src/extensions/`
2. Import it in `index.js`
3. Add it to the `createMarkdownSystem([])` array

## Extension Structure

```js
export const myExtension = {
  name: "my-extension",
  
  // Add custom node types
  nodes: {
    customNode: {
      // Node specification
    }
  },
  
  // Add custom mark types  
  marks: {
    customMark: {
      parseDOM: [{tag: "span.custom"}],
      toDOM() { return ["span", {class: "custom"}, 0]; }
    }
  },
  
  // Configure markdown parsing/serialization
  md: {
    configureMarkdownIt(md) {
      // Configure markdown-it instance
    },
    tokens: {
      // Token mappings for parsing
    },
    toMarkdown: {
      marks: {
        customMark: {
          open: "*",
          close: "*"
        }
      }
    }
  },
  
  // Add keyboard shortcuts
  keymap(schema) {
    return {
      "Mod-k": (state, dispatch) => {
        // Custom command
      }
    };
  }
};
```

## Extension Examples

The extension system allows easy addition of custom markdown features. See the source for implementation patterns.

## Creating Extensions

Extensions can include:
- Custom mark or node definitions  
- Markdown parsing and serialization
- Keyboard shortcuts and input rules

## Text Processing Plugin

The text processing plugin handles markdown serialization customization:

```js
import { createMarkdownSystem } from './markdownSystem.js';
import { presets } from './plugins/textProcessing.js';

// Default: unescapes tildes
const system = createMarkdownSystem([]);

// Disabled: keeps all escaping
const system = createMarkdownSystem([], {
  textProcessing: presets.disabled()
});

// Custom: unescape multiple characters
const system = createMarkdownSystem([], {
  textProcessing: createTextProcessingPlugin({
    unescapeChars: ['~', '_'],
    customReplacements: [
      { from: '-->', to: '→' }
    ]
  })
});
```
