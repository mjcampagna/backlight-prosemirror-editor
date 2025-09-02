// Test to verify HTML literal plugin still works after refactoring
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('HTML Literal Plugin Refactor', () => {
  let dom;
  let document;
  let textarea;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea class="prosemirror-enabled">Regular paragraph.

<div class="example">HTML content here</div>

Another paragraph.

<!-- HTML comment -->

Final paragraph.</textarea>
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
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Element;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  it('should still detect and style HTML literal content after refactoring', () => {
    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    expect(api).toBeDefined();
    
    // Content should be preserved
    expect(textarea.value).toContain('Regular paragraph.');
    expect(textarea.value).toContain('<div class="example">HTML content here</div>');
    expect(textarea.value).toContain('<!-- HTML comment -->');
    expect(textarea.value).toContain('Final paragraph.');
    
    // Test mode switching preserves HTML content
    api.switchTo('markdown');
    const markdownContent = api.view.content;
    
    expect(markdownContent).toContain('Regular paragraph.');
    expect(markdownContent).toContain('<div class="example">HTML content here</div>');
    expect(markdownContent).toContain('<!-- HTML comment -->');
    expect(markdownContent).toContain('Final paragraph.');
    
    // Switch back to ProseMirror mode
    api.switchTo('prosemirror');
    const prosemirrorContent = api.view.content;
    
    expect(prosemirrorContent).toContain('Regular paragraph.');
    expect(prosemirrorContent).toContain('<div class="example">HTML content here</div>');
    expect(prosemirrorContent).toContain('<!-- HTML comment -->');
    expect(prosemirrorContent).toContain('Final paragraph.');
  });

  it('should handle mixed HTML and table content', () => {
    textarea.value = `<div>HTML block</div>

| Table | Row |
| Data  | Here |

<!-- Comment -->

| Another | Table |`;

    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    
    // Test that both HTML and table patterns work together
    api.switchTo('markdown');
    const content = api.view.content;
    
    // Both HTML and table content should be preserved
    expect(content).toContain('<div>HTML block</div>');
    expect(content).toContain('| Table | Row |');
    expect(content).toContain('<!-- Comment -->');
    expect(content).toContain('| Another | Table |');
  });
});
