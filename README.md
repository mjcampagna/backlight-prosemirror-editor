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

The editor automatically initializes on any `<textarea class="prosemirror-enabled">` element with a toggle button for switching modes.

```html
<div>
  <button>Toggle Mode</button>
  <textarea class="prosemirror-enabled">
# Hello World

This is **markdown** content.
  </textarea>
</div>
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

## Debug Mode

Enable detailed logging:
```js
window.__PM_DEBUG = true
```

## License

ISC
