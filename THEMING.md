# Theming Guide

The ProseMirror editor uses CSS variables for easy theming and customization.

## CSS Variables

### Toggle Button Variables
```css
:root {
  --pm-toggle-button-bg: transparent;    /* Toggle button background */
  --pm-toggle-button-color: #2196F3;     /* Toggle button text color */
  --pm-toggle-button-bg-hover: transparent; /* Toggle button hover background */
  --pm-toggle-button-color-hover: #1565C0;  /* Toggle button hover text color */
  --pm-border-radius: 8px;               /* Global border radius */
}
```

### Editor Variables
```css
:root {
  --pm-editor-border: #ddd;           /* Editor border color */
  --pm-editor-border-focus: #999;     /* Editor border when focused */
  --pm-editor-bg: #fff;               /* Editor background */
  --pm-editor-color: #000;            /* Editor text color */
}
```

### Toolbar Variables
```css
:root {
  --pm-toolbar-bg: #f8f8f8;           /* Toolbar background */
  --pm-toolbar-border: #ddd;          /* Toolbar border */
}
```

### Button Variables
```css
:root {
  --pm-btn-bg: #fff;                  /* Button background */
  --pm-btn-border: #ccc;              /* Button border */
  --pm-btn-color: #333;               /* Button text color */
  --pm-btn-bg-hover: #f2f2f2;         /* Button hover background */
  --pm-btn-border-hover: #bbb;        /* Button hover border */
  --pm-btn-color-hover: #333;         /* Button hover text color */
  --pm-btn-bg-active: #e8f0fe;        /* Active button background */
  --pm-btn-border-active: #4285f4;    /* Active button border */
  --pm-btn-color-active: #333;        /* Active button text color */
  --pm-btn-color-disabled: #999;      /* Disabled button text color */
}
```

### Select Variables
```css
:root {
  --pm-select-bg: #fff;               /* Select dropdown background */
  --pm-select-border: #ccc;           /* Select dropdown border */
  --pm-select-color: #333;            /* Select dropdown text color */
}
```

### Content Styling Variables
```css
:root {
  --pm-blockquote-border: #ddd;       /* Blockquote left border */
  --pm-blockquote-bg: #f9f9f9;        /* Blockquote background */
  --pm-blockquote-color: inherit;     /* Blockquote text color */
  --pm-code-bg: #f4f4f4;              /* Inline code background */
  --pm-code-color: #333;              /* Inline code text color */
  --pm-code-block-bg: #f8f8f8;        /* Code block background */
  --pm-code-block-color: #333;        /* Code block text color */
}
```

## Usage Examples

### Dark Theme
```css
:root {
  --pm-toggle-button-bg: transparent;
  --pm-toggle-button-color: #64b5f6;
  --pm-toggle-button-bg-hover: rgba(100, 181, 246, 0.1);
  --pm-toggle-button-color-hover: #90caf9;
  
  --pm-editor-border: #444;
  --pm-editor-border-focus: #666;
  --pm-editor-bg: #1a1a1a;
  --pm-editor-color: #e0e0e0;
  
  --pm-toolbar-bg: #2d2d2d;
  --pm-toolbar-border: #444;
  
  --pm-btn-bg: #333;
  --pm-btn-border: #555;
  --pm-btn-color: #e0e0e0;
  --pm-btn-bg-hover: #404040;
  --pm-btn-border-hover: #666;
  --pm-btn-color-hover: #fff;
  --pm-btn-bg-active: #0066cc;
  --pm-btn-border-active: #0088ff;
  --pm-btn-color-active: #fff;
  --pm-btn-color-disabled: #888;
  
  --pm-select-bg: #333;
  --pm-select-border: #555;
  --pm-select-color: #e0e0e0;
  
  --pm-blockquote-border: #555;
  --pm-blockquote-bg: #2a2a2a;
  --pm-blockquote-color: #ccc;
  --pm-code-bg: #333;
  --pm-code-color: #e0e0e0;
  --pm-code-block-bg: #2a2a2a;
  --pm-code-block-color: #e0e0e0;
}

/* Additional text colors for dark theme */
.ProseMirror {
  color: #e0e0e0;
}

.pm-btn, .pm-select select {
  color: #e0e0e0;
}
```

### Brand Colors
```css
:root {
  --pm-toggle-button-color: #your-brand-color;
  --pm-toggle-button-color-hover: #your-brand-color-dark;
  --pm-btn-bg-active: #your-brand-color;
  --pm-btn-border-active: #your-brand-color;
  --pm-editor-border-focus: #your-brand-color;
  --pm-modal-btn-primary-bg: #your-brand-color;
}
```

### Minimal Theme
```css
:root {
  --pm-editor-border: transparent;
  --pm-toolbar-bg: transparent;
  --pm-toolbar-border: transparent;
  --pm-btn-bg: transparent;
  --pm-btn-border: transparent;
}
```

## Integration

Simply include the CSS bundle and override the variables:

```html
<link rel="stylesheet" href="./dist/prosemirror-bundle.css">
<style>
  :root {
    --pm-editor-bg: #f9f9f9;
    --pm-btn-active-bg: #your-brand;
  }
</style>
```

See [theme-example.html](theme-example.html) for a complete dark theme implementation.
