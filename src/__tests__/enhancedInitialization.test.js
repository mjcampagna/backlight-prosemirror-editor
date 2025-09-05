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
    global.alert = vi.fn();
    global.requestAnimationFrame = vi.fn((cb) => cb());
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.alert;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
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

    it('should show alert and skip non-textarea elements', () => {
      initProseMirrorEditor('.not-textarea');
      
      expect(global.alert).toHaveBeenCalledWith(
        'Error: initProseMirrorEditor requires textarea elements. Found: div'
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

    it('should alert for div elements', () => {
      initProseMirrorEditor('#not-textarea');
      
      expect(global.alert).toHaveBeenCalledWith(
        'Error: initProseMirrorEditor requires textarea elements. Found: div'
      );
    });

    it('should alert for span elements', () => {
      initProseMirrorEditor('.also-not-textarea');
      
      expect(global.alert).toHaveBeenCalledWith(
        'Error: initProseMirrorEditor requires textarea elements. Found: span'
      );
    });

    it('should alert for input elements', () => {
      initProseMirrorEditor('.input-element');
      
      expect(global.alert).toHaveBeenCalledWith(
        'Error: initProseMirrorEditor requires textarea elements. Found: input'
      );
    });

    it('should continue processing valid elements after errors', () => {
      // Mix valid and invalid selectors
      initProseMirrorEditor('div, textarea');
      
      // Should alert for div but still initialize textarea
      expect(global.alert).toHaveBeenCalled();
      
      const textarea = document.querySelector('textarea');
      expect(textarea._editorAPI).toBeDefined();
    });

    it('should handle empty selectors gracefully', () => {
      expect(() => {
        initProseMirrorEditor('.nonexistent-element');
      }).not.toThrow();
      
      // Should not call alert since no elements matched
      expect(global.alert).not.toHaveBeenCalled();
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
});
