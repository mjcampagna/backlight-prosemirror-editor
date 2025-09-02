# ProseMirror Editor

A dual-mode markdown/WYSIWYG editor built with ProseMirror, featuring a modular architecture and extensible markdown system.

## Features

- **Dual Mode**: Switch between markdown text and WYSIWYG editing
- **Extension System**: Add custom markdown features easily
- **Comprehensive Toolbar**: Rich editing controls with keyboard shortcuts
- **Modular Architecture**: Clean, maintainable codebase
- **Full Test Coverage**: 40+ tests with Vitest

## Quick Start

```bash
npm install
npm run dev    # Development server
npm run build  # Production build
npm run test   # Run tests
```

## Usage

### Basic Usage

The editor requires explicit initialization on `<textarea class="prosemirror-enabled">` elements. A toggle button for switching modes will be auto-created if one doesn't exist.

```html
<head>
  <!-- Include essential editor styles -->
  <link rel="stylesheet" href="./dist/prosemirror-bundle.css">
</head>
<body>
  <div>
    <!-- Button is optional - will be auto-created if missing -->
    <textarea class="prosemirror-enabled">
# Hello World

This is **markdown** content.
    </textarea>
  </div>
  
  <!-- Initialize the editor -->
  <script type="module">
    import { initProseMirrorEditor } from "./dist/prosemirror-bundle.esm.js";
    initProseMirrorEditor();
  </script>
</body>
```

### Custom Selector

Use your own CSS selector for targeting textareas:

```html
<!-- Your HTML -->
<textarea class="my-editor">Content here</textarea>

<!-- Initialize with custom selector -->
<script type="module">
  import { initProseMirrorEditor } from "./dist/prosemirror-bundle.esm.js";
  
  // Custom selector
  initProseMirrorEditor(".my-editor");
  
  // Or multiple selectors
  initProseMirrorEditor("textarea[data-editor='prosemirror']");
</script>
```

## Architecture

### Core Components
- `src/index.js` - Main editor with dual-mode functionality
- `src/markdownSystem.js` - Extension system for custom markdown features
- `src/markdownToolbarPlugin.js` - Modular toolbar implementation

### Modular Structure
```
src/
├── commands/     - Editor commands (list, block, unified)
├── debug/        - Debug utilities
├── extensions/   - Markdown extensions
├── ui/           - UI component builders
├── utils/        - Selection and window utilities
└── __tests__/    - Test suites
```

## Extensions

Create custom markdown features by adding extensions:

```js
import { createMarkdownSystem } from './markdownSystem.js'
import { myExtension } from './extensions/myExtension.js'

const system = createMarkdownSystem([myExtension])
```

See [EXTENSIONS.md](EXTENSIONS.md) for details.

## Theming

Customize colors using CSS variables:

```css
:root {
  --pm-editor-bg: #f9f9f9;
  --pm-btn-bg-active: #your-brand-color;
  --pm-toolbar-bg: #your-background;
}
```

See [THEMING.md](THEMING.md) for complete variable reference and examples.

## Debug Mode

Enable detailed logging:
```js
window.__PM_DEBUG = true
```

## License

ISC
