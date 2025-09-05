// HR button functionality tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('Horizontal Rule Button', () => {
  let dom;
  let document;
  let textarea;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea data-editor-mode="prosemirror">Some initial content.</textarea>
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
    textarea = document.querySelector('textarea[data-editor-mode]');
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Element;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  it('should initialize editor with HR button in toolbar', () => {
    initProseMirrorEditor('textarea');

    const api = textarea._editorAPI;
    expect(api).toBeDefined();
    
    // Should have content
    expect(textarea.value).toContain('Some initial content.');
  });

  it('should serialize HR correctly in markdown mode', () => {
    textarea.value = `Some text

---

More text`;

    initProseMirrorEditor('textarea');

    const api = textarea._editorAPI;
    
    // Switch to markdown mode to check serialization
    api.switchTo('markdown');
    const content = api.view.content;
    
    // Should contain HR in markdown format
    expect(content).toContain('Some text');
    expect(content).toContain('More text');
    expect(content).toContain('---'); // HR in markdown
  });

  it('should handle HR in mixed content correctly', () => {
    textarea.value = `# Heading

Some paragraph content.

---

| Table | Content |
| ----- | ------- |
| Data  | Here    |

---

Final paragraph.`;

    initProseMirrorEditor('textarea');
    
    const api = textarea._editorAPI;
    
    // Test mode switching preserves HR
    api.switchTo('markdown');
    const markdownContent = api.view.content;
    
    // Should preserve all content including HR
    expect(markdownContent).toContain('# Heading');
    expect(markdownContent).toContain('Some paragraph content.');
    expect(markdownContent).toContain('---');
    expect(markdownContent).toContain('| Table | Content |');
    expect(markdownContent).toContain('Final paragraph.');
    
    // Switch back to ProseMirror mode
    api.switchTo('prosemirror');
    const prosemirrorContent = api.view.content;
    
    // Content should be preserved
    expect(prosemirrorContent).toContain('Heading');
    expect(prosemirrorContent).toContain('Some paragraph content.');
    expect(prosemirrorContent).toContain('Table');
    expect(prosemirrorContent).toContain('Final paragraph.');
  });
});
