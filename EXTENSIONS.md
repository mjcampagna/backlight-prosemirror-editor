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

## Example: Strikethrough

The included `strikethroughExtension` demonstrates:
- Custom mark definition
- Markdown serialization (`~~text~~`)
- Keyboard shortcut (`Mod-Shift-x`)

## Available Extensions

- `strikethroughExtension` - Adds strikethrough support with `~~text~~` syntax and `Cmd+Shift+X` shortcut
