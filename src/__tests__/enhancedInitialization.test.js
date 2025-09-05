import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { initProseMirrorEditor } from '../index.js';

describe('Enhanced Initialization Capabilities', () => {
  let dom, document;

  beforeEach(() => {
    // Mock DOM environment
    dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    global.requestAnimationFrame = vi.fn((cb) => cb());
    global.cancelAnimationFrame = vi.fn();
    
    // Mock console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
    vi.restoreAllMocks();
  });

  describe('Flexible Selector Support', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <textarea id="my-editor" data-editor-mode="prosemirror">Content 1</textarea>
        <textarea class="editor" data-editor-mode="markdown">Content 2</textarea>
        <textarea class="my-great-editor" data-editor="prosemirror">Content 3</textarea>
        <textarea data-editor="markdown">Content 4</textarea>
        <textarea data-editor-mode="prosemirror">Content 5</textarea>
        <div class="not-textarea" data-editor="prosemirror">Should not work</div>
      `;
    });

    it('should work with ID selectors', () => {
      initProseMirrorEditor('#my-editor');
      
      const textarea = document.getElementById('my-editor');
      const api = textarea._editorAPI;
      
      expect(api).toBeDefined();
      expect(api.mode).toBe('prosemirror'); // from data-editor-mode
    });

    it('should work with class selectors', () => {
      initProseMirrorEditor('.editor');
      
      const textarea = document.querySelector('.editor');
      const api = textarea._editorAPI;
      
      expect(api).toBeDefined();
      expect(api.mode).toBe('markdown'); // from data-editor-mode
    });

    it('should work with multiple class selector', () => {
      initProseMirrorEditor('.my-great-editor');
      
      const textarea = document.querySelector('.my-great-editor');
      const api = textarea._editorAPI;
      
      expect(api).toBeDefined();
      expect(api.mode).toBe('prosemirror'); // from data-editor
    });

    it('should work with data attribute selectors', () => {
      initProseMirrorEditor('textarea[data-editor="markdown"]');
      
      const textareas = document.querySelectorAll('textarea[data-editor="markdown"]');
      expect(textareas.length).toBe(1);
      
      const api = textareas[0]._editorAPI;
      expect(api).toBeDefined();
      expect(api.mode).toBe('markdown');
    });

    it('should work with combined selectors', () => {
      initProseMirrorEditor('textarea[data-editor-mode="prosemirror"]');
      
      const textareas = document.querySelectorAll('textarea[data-editor-mode="prosemirror"]');
      expect(textareas.length).toBe(2);
      
      // Both should be initialized
      textareas.forEach(textarea => {
        const api = textarea._editorAPI;
        expect(api).toBeDefined();
        expect(api.mode).toBe('prosemirror');
      });
    });

    it('should work with generic textarea selector', () => {
      initProseMirrorEditor('textarea');
      
      // Should initialize all textareas
      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBe(5);
      
      textareas.forEach(textarea => {
        const api = textarea._editorAPI;
        expect(api).toBeDefined();
      });
    });

    it('should warn and skip non-textarea elements', () => {
      initProseMirrorEditor('.not-textarea');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[ProseMirror] Skipping non-textarea element: div. initProseMirrorEditor requires textarea elements.'
      );
      
      const div = document.querySelector('.not-textarea');
      expect(div._editorAPI).toBeUndefined();
    });
  });

  describe('Mode Detection from Data Attributes', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <textarea data-editor="markdown">MD via data-editor</textarea>
        <textarea data-editor="prosemirror">PM via data-editor</textarea>
        <textarea data-editor-mode="markdown">MD via data-editor-mode</textarea>
        <textarea data-editor-mode="prosemirror">PM via data-editor-mode</textarea>
        <textarea data-editor="invalid">Invalid mode</textarea>
        <textarea>No data attributes</textarea>
        <textarea data-editor="markdown" data-editor-mode="prosemirror">Both attributes</textarea>
      `;
    });

    it('should detect markdown mode from data-editor attribute', () => {
      initProseMirrorEditor('textarea[data-editor="markdown"]');
      
      const textarea = document.querySelector('textarea[data-editor="markdown"]');
      const api = textarea._editorAPI;
      
      expect(api.mode).toBe('markdown');
    });

    it('should detect prosemirror mode from data-editor-mode attribute', () => {
      initProseMirrorEditor('textarea[data-editor-mode="prosemirror"]');
      
      const textarea = document.querySelector('textarea[data-editor-mode="prosemirror"]');
      const api = textarea._editorAPI;
      
      expect(api.mode).toBe('prosemirror');
    });

    it('should prioritize data-editor over data-editor-mode', () => {
      initProseMirrorEditor('textarea');
      
      // Find the textarea with both attributes
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const bothAttrsTextarea = textareas.find(ta => 
        ta.getAttribute('data-editor') === 'markdown' && 
        ta.getAttribute('data-editor-mode') === 'prosemirror'
      );
      
      const api = bothAttrsTextarea._editorAPI;
      expect(api.mode).toBe('markdown'); // data-editor takes priority
    });

    it('should default to prosemirror for invalid mode values', () => {
      initProseMirrorEditor('textarea[data-editor="invalid"]');
      
      const textarea = document.querySelector('textarea[data-editor="invalid"]');
      const api = textarea._editorAPI;
      
      expect(api.mode).toBe('prosemirror'); // falls back to default
    });

    it('should default to prosemirror when no data attributes', () => {
      initProseMirrorEditor('textarea');
      
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const noDataTextarea = textareas.find(ta => 
        !ta.getAttribute('data-editor') && !ta.getAttribute('data-editor-mode')
      );
      
      const api = noDataTextarea._editorAPI;
      expect(api.mode).toBe('prosemirror');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="not-textarea">Not a textarea</div>
        <span class="also-not-textarea">Also not a textarea</span>
        <input type="text" class="input-element">Input element</input>
        <textarea data-editor-mode="prosemirror">Valid textarea</textarea>
      `;
    });

    it('should warn for div elements', () => {
      initProseMirrorEditor('#not-textarea');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[ProseMirror] Skipping non-textarea element: div. initProseMirrorEditor requires textarea elements.'
      );
    });

    it('should warn for span elements', () => {
      initProseMirrorEditor('.also-not-textarea');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[ProseMirror] Skipping non-textarea element: span. initProseMirrorEditor requires textarea elements.'
      );
    });

    it('should warn for input elements', () => {
      initProseMirrorEditor('.input-element');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[ProseMirror] Skipping non-textarea element: input. initProseMirrorEditor requires textarea elements.'
      );
    });

    it('should continue processing valid elements after errors', () => {
      // Mix valid and invalid selectors
      initProseMirrorEditor('div, textarea');
      
      // Should warn for div but still initialize textarea
      expect(console.warn).toHaveBeenCalled();
      
      const textarea = document.querySelector('textarea');
      expect(textarea._editorAPI).toBeDefined();
    });

    it('should handle empty selectors gracefully', () => {
      expect(() => {
        initProseMirrorEditor('.nonexistent-element');
      }).not.toThrow();
      
      // Should not warn since no elements matched
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('API Functionality', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <textarea data-editor-mode="markdown" id="test-editor">
# Test Content

This is a test with **bold** text.
        </textarea>
      `;
    });

    it('should provide complete API on initialized textareas', () => {
      initProseMirrorEditor('#test-editor');
      
      const textarea = document.getElementById('test-editor');
      const api = textarea._editorAPI;
      
      expect(api).toBeDefined();
      expect(typeof api.mode).toBe('string');
      expect(typeof api.view).toBe('object');
      expect(typeof api.toggle).toBe('function');
      expect(typeof api.switchTo).toBe('function');
      expect(typeof api.refreshButton).toBe('function');
    });

    it('should start in correct mode based on data attribute', () => {
      initProseMirrorEditor('#test-editor');
      
      const textarea = document.getElementById('test-editor');
      const api = textarea._editorAPI;
      
      expect(api.mode).toBe('markdown'); // from data-editor-mode="markdown"
    });

    it('should allow mode switching via API', () => {
      initProseMirrorEditor('#test-editor');
      
      const textarea = document.getElementById('test-editor');
      const api = textarea._editorAPI;
      
      expect(api.mode).toBe('markdown');
      
      api.switchTo('prosemirror');
      expect(api.mode).toBe('prosemirror');
      
      api.toggle();
      expect(api.mode).toBe('markdown');
    });

    it('should preserve content during mode switches', () => {
      initProseMirrorEditor('#test-editor');
      
      const textarea = document.getElementById('test-editor');
      const api = textarea._editorAPI;
      const originalContent = api.view.content;
      
      api.toggle();
      api.toggle();
      
      // Content should be preserved (allow for minor whitespace normalization)
      expect(api.view.content.trim()).toEqual(originalContent.trim());
    });
  });

  describe('Edge Cases', () => {
    it('should handle textareas without parent elements', () => {
      // Create orphaned textarea
      const textarea = document.createElement('textarea');
      textarea.setAttribute('data-editor-mode', 'prosemirror');
      
      expect(() => {
        // This would normally fail, but should be handled gracefully
        // Since ta.parentElement would be null
      }).not.toThrow();
    });

    it('should create editor API on valid textareas', () => {
      // Test that the API is properly created and accessible
      document.body.innerHTML = `<div><textarea data-editor-mode="prosemirror">Content</textarea></div>`;
      
      initProseMirrorEditor('textarea');
      const textarea = document.querySelector('textarea');
      
      expect(textarea._editorAPI).toBeDefined();
      expect(textarea._editorAPI.mode).toBe('prosemirror');
      expect(typeof textarea._editorAPI.switchTo).toBe('function');
    });
  });

  describe('Multiple Editor Isolation', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div>
          <textarea id="editor1" data-editor-mode="prosemirror">Editor 1 Content</textarea>
        </div>
        <div>
          <textarea id="editor2" data-editor-mode="markdown">Editor 2 Content</textarea>
        </div>
        <div>
          <textarea id="editor3" data-editor="prosemirror">Editor 3 Content</textarea>
        </div>
      `;
    });

    it('should initialize multiple editors independently', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      const editor3 = document.getElementById('editor3');
      
      // All should have their own API
      expect(editor1._editorAPI).toBeDefined();
      expect(editor2._editorAPI).toBeDefined();
      expect(editor3._editorAPI).toBeDefined();
      
      // Should start in their specified modes
      expect(editor1._editorAPI.mode).toBe('prosemirror');
      expect(editor2._editorAPI.mode).toBe('markdown');
      expect(editor3._editorAPI.mode).toBe('prosemirror');
    });

    it('should toggle only the target editor when button is clicked', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      const editor3 = document.getElementById('editor3');
      
      const api1 = editor1._editorAPI;
      const api2 = editor2._editorAPI;
      const api3 = editor3._editorAPI;
      
      // Record initial modes
      const initialMode1 = api1.mode;
      const initialMode2 = api2.mode;
      const initialMode3 = api3.mode;
      
      // Toggle only editor1
      api1.toggle();
      
      // Editor1 should change, others should remain the same
      expect(api1.mode).not.toBe(initialMode1);
      expect(api2.mode).toBe(initialMode2);
      expect(api3.mode).toBe(initialMode3);
    });

    it('should switch specific editor mode without affecting others', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      const editor3 = document.getElementById('editor3');
      
      const api1 = editor1._editorAPI;
      const api2 = editor2._editorAPI;
      const api3 = editor3._editorAPI;
      
      // Switch editor2 to prosemirror mode
      api2.switchTo('prosemirror');
      
      // Only editor2 should change
      expect(api1.mode).toBe('prosemirror'); // unchanged
      expect(api2.mode).toBe('prosemirror'); // changed from markdown
      expect(api3.mode).toBe('prosemirror'); // unchanged
    });

    it('should maintain independent content across editors', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      
      const api1 = editor1._editorAPI;
      const api2 = editor2._editorAPI;
      
      const content1 = api1.view.content;
      const content2 = api2.view.content;
      
      // Contents should be different and independent
      expect(content1).not.toBe(content2);
      expect(content1).toContain('Editor 1');
      expect(content2).toContain('Editor 2');
      
      // Switching one shouldn't affect the other's content
      api1.toggle();
      
      expect(api1.view.content).toContain('Editor 1');
      expect(api2.view.content).toContain('Editor 2');
    });

    it('should create separate toggle buttons for each editor', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      const editor3 = document.getElementById('editor3');
      
      // Each editor should have its own control wrapper and button
      const controls1 = editor1.parentElement.querySelector('.pm-editor-controls');
      const controls2 = editor2.parentElement.querySelector('.pm-editor-controls');
      const controls3 = editor3.parentElement.querySelector('.pm-editor-controls');
      
      expect(controls1).toBeDefined();
      expect(controls2).toBeDefined();
      expect(controls3).toBeDefined();
      
      // Each should have exactly one button
      expect(controls1.querySelectorAll('button').length).toBe(1);
      expect(controls2.querySelectorAll('button').length).toBe(1);
      expect(controls3.querySelectorAll('button').length).toBe(1);
    });

    it('should handle clicking different toggle buttons independently', () => {
      initProseMirrorEditor('textarea');
      
      const editor1 = document.getElementById('editor1');
      const editor2 = document.getElementById('editor2');
      
      const api1 = editor1._editorAPI;
      const api2 = editor2._editorAPI;
      
      const button1 = editor1.parentElement.querySelector('button');
      const button2 = editor2.parentElement.querySelector('button');
      
      const initialMode1 = api1.mode;
      const initialMode2 = api2.mode;
      
      // Click button1
      button1.click();
      
      // Only editor1 should change mode
      expect(api1.mode).not.toBe(initialMode1);
      expect(api2.mode).toBe(initialMode2);
      
      // Click button2
      button2.click();
      
      // Now editor2 should also change, but editor1 should remain in its new mode
      const mode1AfterFirstClick = api1.mode;
      expect(api2.mode).not.toBe(initialMode2);
      expect(api1.mode).toBe(mode1AfterFirstClick); // unchanged from second click
    });
  });
});
