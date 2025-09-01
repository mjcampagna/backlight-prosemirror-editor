# Agent Instructions

## Commands

### Development
- `npm run dev` - Start development server with HMR
- `npm run build` - Build production bundle
- `npm run serve` - Preview production build

### Testing
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once and exit
- `npm run test:ui` - Run tests with UI interface

## Project Structure

### Core Files
- `src/index.js` - Main editor implementation with dual markdown/WYSIWYG modes
- `src/markdownSystem.js` - Extension system for custom markdown features
- `src/markdownToolbarPlugin.js` - Refactored toolbar plugin (208 lines, was 898)

### Modular Architecture
```
src/
├── debug/utils.js - Debug helpers (PM_DEBUG, logging)
├── utils/
│   ├── selection.js - Selection & state utilities
│   ├── window.js - Window mapping & dispatch
│   └── shared.js - Shared utilities
├── ui/builders.js - UI component builders (makeBtn, makeSelect)
├── commands/
│   ├── list.js - List operations
│   ├── block.js - Block operations  
│   └── unified.js - Unified commands
├── extensions/
│   └── strikethrough.js - Example extension
└── __tests__/ - Integration tests
```

### Testing
- **Framework**: Vitest with jsdom
- **Coverage**: Core functionality, utilities, UI builders
- **Location**: `__tests__/` folders alongside source files
- **Test files**: 40 tests across 7 test files

## Code Conventions
- ES modules with `.js` extensions
- Absolute imports from project root
- ProseMirror schema-based architecture
- Extension system for markdown features

## Debug Mode
Set `window.__PM_DEBUG = true` in console to enable detailed logging of ProseMirror operations.
