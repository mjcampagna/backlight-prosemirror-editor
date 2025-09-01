# Theming Guide

The ProseMirror editor uses CSS variables for easy theming and customization.

## CSS Variables

### Editor Variables
```css
:root {
  --pm-editor-border: #ddd;           /* Editor border color */
  --pm-editor-border-focus: #999;     /* Editor border when focused */
  --pm-editor-bg: #fff;               /* Editor background */
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
  --pm-btn-hover-bg: #f2f2f2;         /* Button hover background */
  --pm-btn-hover-border: #bbb;        /* Button hover border */
  --pm-btn-active-bg: #e8f0fe;        /* Active button background */
  --pm-btn-active-border: #4285f4;    /* Active button border */
}
```

### Select Variables
```css
:root {
  --pm-select-bg: #fff;               /* Select dropdown background */
  --pm-select-border: #ccc;           /* Select dropdown border */
}
```

## Usage Examples

### Dark Theme
```css
:root {
  --pm-editor-border: #444;
  --pm-editor-border-focus: #666;
  --pm-editor-bg: #1a1a1a;
  
  --pm-toolbar-bg: #2d2d2d;
  --pm-toolbar-border: #444;
  
  --pm-btn-bg: #333;
  --pm-btn-border: #555;
  --pm-btn-hover-bg: #404040;
  --pm-btn-hover-border: #666;
  --pm-btn-active-bg: #0066cc;
  --pm-btn-active-border: #0088ff;
  
  --pm-select-bg: #333;
  --pm-select-border: #555;
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
  --pm-btn-active-bg: #your-brand-color;
  --pm-btn-active-border: #your-brand-color;
  --pm-editor-border-focus: #your-brand-color;
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
