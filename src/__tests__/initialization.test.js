import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initProseMirrorEditor } from '../index.js'

// Mock DOM
global.document = {
  querySelectorAll: vi.fn(() => []),
  createElement: vi.fn(() => ({
    className: '',
    style: {},
    insertAdjacentElement: vi.fn(),
    addEventListener: vi.fn(),
    appendChild: vi.fn()
  }))
}

describe('Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initProseMirrorEditor', () => {
    it('should use default selector when called without arguments', () => {
      initProseMirrorEditor()
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('textarea.prosemirror-enabled')
    })

    it('should use custom selector when provided', () => {
      initProseMirrorEditor('.my-custom-editor')
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('.my-custom-editor')
    })

    it('should work with complex selectors', () => {
      const complexSelector = 'textarea[data-editor="prosemirror"]'
      initProseMirrorEditor(complexSelector)
      
      expect(document.querySelectorAll).toHaveBeenCalledWith(complexSelector)
    })

    it('should work with ID selectors', () => {
      initProseMirrorEditor('#main-editor')
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('#main-editor')
    })

    it('should export the function for module use', () => {
      expect(typeof initProseMirrorEditor).toBe('function')
    })
  })
})
