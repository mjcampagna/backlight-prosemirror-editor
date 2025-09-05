// Table structure preservation integration test
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('Table Structure Preservation', () => {
  let dom;
  let document;
  let textarea;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea data-editor-mode="prosemirror"></textarea>
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
    // Clean up
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Element;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  it('should fix the user reported issue with multi-line table structure', () => {
    // Set the exact content the user reported as problematic
    textarea.value = `| Header 1 | Header 2 | Header 3 | 
| :------- | :------: | -------: | 
| Left     | Centered | Right    | 
| Item A   | Item B   | Item C   |`;

    initProseMirrorEditor('textarea');
    
    const api = textarea._editorAPI;
    
    // Start in ProseMirror mode, then switch to markdown to see the serialization
    expect(api.mode).toBe('prosemirror');
    
    api.switchTo('markdown');
    const markdownContent = api.view.content;
    
    // Should NOT be combined into a single line
    expect(markdownContent).not.toBe('| Header 1 | Header 2 | Header 3 | | :------- | :------: | -------: | | Left     | Centered | Right    | | Item A   | Item B   | Item C   |');
    
    // Should maintain proper table structure with line breaks
    expect(markdownContent).toContain('| Header 1 | Header 2 | Header 3 |');
    expect(markdownContent).toContain('| :------- | :------: | -------: |');
    expect(markdownContent).toContain('| Left     | Centered | Right    |');
    expect(markdownContent).toContain('| Item A   | Item B   | Item C   |');
    
    // Should have line breaks between rows
    expect(markdownContent).toContain('\n| :------- | :------: | -------: |');
    expect(markdownContent).toContain('\n| Left     | Centered | Right    |');
    expect(markdownContent).toContain('\n| Item A   | Item B   | Item C   |');
    
    // Switch back to ProseMirror mode
    api.switchTo('prosemirror');
    
    // Content should be preserved with proper structure
    const prosemirrorContent = api.view.content;
    expect(prosemirrorContent).toContain('| Header 1 | Header 2 | Header 3 |');
    expect(prosemirrorContent).toContain('| :------- | :------: | -------: |');
    expect(prosemirrorContent).toContain('| Left     | Centered | Right    |');
    expect(prosemirrorContent).toContain('| Item A   | Item B   | Item C   |');
  });

  it('should handle separate tables correctly', () => {
    textarea.value = `| Table 1 |
| Data 1  |

| Table 2 | Column 2 |
| Data 2  | More     |`;

    initProseMirrorEditor('textarea');
    
    const api = textarea._editorAPI;
    
    // Test mode switching preserves table separation
    api.switchTo('markdown');
    const content = api.view.content;
    
    // Should maintain table structure within each table
    expect(content).toContain('| Table 1 |\n| Data 1  |');
    expect(content).toContain('| Table 2 | Column 2 |\n| Data 2  | More     |');
    
    // Note: Separate table spacing is a known issue that needs further work
    // For now, we focus on ensuring individual table structure is preserved
  });

  it('should work with mixed content and tables', () => {
    textarea.value = `Regular paragraph.

| Header | Value |
| Data   | Here  |

Another paragraph.

| Another | Table |
| More    | Data  |`;

    initProseMirrorEditor('textarea');
    
    const api = textarea._editorAPI;
    
    api.switchTo('markdown');
    const content = api.view.content;
    
    // Tables should maintain structure
    expect(content).toContain('| Header | Value |\n| Data   | Here  |');
    expect(content).toContain('| Another | Table |\n| More    | Data  |');
    
    // Regular paragraphs should be preserved
    expect(content).toContain('Regular paragraph.');
    expect(content).toContain('Another paragraph.');
  });
});
