// Integration test for table row pattern detection
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('Table Row Pattern Integration', () => {
  let dom;
  let document;
  let textarea;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea class="prosemirror-enabled">This is a regular paragraph.

| Header 1 | Header 2 |
| Value 1 | Value 2 |
| Row with spaces |   

Another paragraph.</textarea>
        </body>
      </html>
    `);
    
    global.document = dom.window.document;
    global.window = dom.window;
    global.HTMLElement = dom.window.HTMLElement;
    global.Element = dom.window.Element;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    document = dom.window.document;
    textarea = document.querySelector('textarea.prosemirror-enabled');
  });

  afterEach(() => {
    // Clean up
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Element;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  it('should initialize with mixed content including table rows', () => {
    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    expect(api).toBeDefined();
    expect(api.mode).toBe('prosemirror');
    
    // Content should be preserved
    expect(textarea.value).toContain('This is a regular paragraph.');
    expect(textarea.value).toContain('| Header 1 | Header 2 |');
    expect(textarea.value).toContain('| Value 1 | Value 2 |');
    expect(textarea.value).toContain('| Row with spaces |');
    expect(textarea.value).toContain('Another paragraph.');
  });

  it('should preserve content when switching modes', () => {
    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    
    // Switch to markdown mode
    api.switchTo('markdown');
    const markdownContent = api.view.content;
    
    // All content should be preserved
    expect(markdownContent).toContain('This is a regular paragraph.');
    expect(markdownContent).toContain('| Header 1 | Header 2 |');
    expect(markdownContent).toContain('| Value 1 | Value 2 |');
    expect(markdownContent).toContain('Another paragraph.');
    
    // Switch back to ProseMirror mode
    api.switchTo('prosemirror');
    const prosemirrorContent = api.view.content;
    
    // Content should still be preserved
    expect(prosemirrorContent).toContain('This is a regular paragraph.');
    expect(prosemirrorContent).toContain('| Header 1 | Header 2 |');
    expect(prosemirrorContent).toContain('| Value 1 | Value 2 |');
    expect(prosemirrorContent).toContain('Another paragraph.');
  });

  it('should handle various table row patterns', () => {
    textarea.value = `| Simple |
| With | Multiple | Columns |
| Data with spaces |   
|Compact|Style|
| Mixed   | Spacing  | Here |  `;

    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    
    // Test mode switching preserves all patterns
    api.switchTo('markdown');
    api.switchTo('prosemirror');
    
    const content = api.view.content;
    
    // All table patterns should be preserved
    expect(content).toContain('| Simple |');
    expect(content).toContain('| With | Multiple | Columns |');
    expect(content).toContain('| Data with spaces |');
    expect(content).toContain('|Compact|Style|');
    expect(content).toContain('| Mixed   | Spacing  | Here |');
  });
});
