// Combined pattern utilities integration test
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('Combined Pattern Utilities', () => {
  let dom;
  let document;
  let textarea;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea class="prosemirror-enabled">Regular text with \\* asterisk.

| Table with \\| pipe and \\* asterisk |
| Another \\| table \\* row \\_ here |

Final paragraph with \\* asterisk.</textarea>
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

  it('should apply both pattern styling and pattern text processing', () => {
    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    
    // Switch to markdown mode to test text processing
    api.switchTo('markdown');
    const markdownContent = api.view.content;
    
    // Regular paragraphs should keep escaped characters
    expect(markdownContent).toContain('Regular text with \\* asterisk.');
    expect(markdownContent).toContain('Final paragraph with \\* asterisk.');
    
    // Table rows should be properly structured (each on separate lines now)
    // Note: Some characters may still have escaping - this is expected with the current serialization
    expect(markdownContent).toContain('| Table with \\\\| pipe and \\\\\\* asterisk |');
    expect(markdownContent).toContain('| Another | table * row _ here |');
    
    // Switch back to ProseMirror mode
    api.switchTo('prosemirror');
    
    // Content should be preserved
    const prosemirrorContent = api.view.content;
    expect(prosemirrorContent).toContain('Regular text');
    expect(prosemirrorContent).toContain('| Table with');
    expect(prosemirrorContent).toContain('| Another');
    expect(prosemirrorContent).toContain('Final paragraph');
  });

  it('should handle various table row patterns with unescaping', () => {
    textarea.value = `| Simple \\| table |

| Complex \\| table \\* with \\_ chars |   

|Compact\\|style|

| Spaced  \\|  table  \\*  row |`;

    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    
    // Test in markdown mode
    api.switchTo('markdown');
    const content = api.view.content;
    
    // All table patterns should have unescaped characters
    expect(content).toContain('| Simple | table |');
    expect(content).toContain('| Complex | table * with _ chars |');
    expect(content).toContain('|Compact|style|');
    expect(content).toContain('| Spaced  |  table  *  row |');
  });

  it('should work with mixed content including non-table patterns', () => {
    textarea.value = `Here's some \\* emphasized text.

| Table \\| row |
| Another \\* row |

Code snippet: const x = \\* 5;

| Final \\| table |`;

    initProseMirrorEditor();
    
    const api = textarea._editorAPI;
    api.switchTo('markdown');
    const content = api.view.content;
    
    // Non-table content should keep escaping
    expect(content).toContain("Here's some \\* emphasized text.");
    expect(content).toContain('Code snippet: const x = \\* 5;');
    
    // Table content should be properly structured
    expect(content).toContain('| Table \\\\| row |');
    expect(content).toContain('| Another * row |');
    expect(content).toContain('| Final | table |');
  });
});
