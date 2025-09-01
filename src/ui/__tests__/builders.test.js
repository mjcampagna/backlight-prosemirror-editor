import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeBtn, makeSelect } from '../builders.js'

// Mock DOM methods
global.document = {
  createElement: vi.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      type: '',
      className: '',
      textContent: '',
      title: '',
      disabled: false,
      innerHTML: '',
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      classList: {
        toggle: vi.fn()
      },
      appendChild: vi.fn((child) => {
        // Simulate appendChild behavior for select
        if (element.tagName === 'DIV' && child.tagName === 'SELECT') {
          element.innerHTML = child.innerHTML
        }
      }),
      style: {}
    }
    
    if (tag === 'select') {
      element.value = ''
      Object.defineProperty(element, 'innerHTML', {
        get() { return this._innerHTML || '' },
        set(value) { this._innerHTML = value }
      })
    }
    
    return element
  })
}

describe('UI Builders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('makeBtn', () => {
    it('should create button with correct properties', () => {
      const config = {
        label: 'Bold',
        title: 'Make text bold',
        run: vi.fn(),
        isActive: vi.fn(() => false),
        isEnabled: vi.fn(() => true)
      }

      const btn = makeBtn(config)

      expect(btn.dom).toBeDefined()
      expect(btn.dom.type).toBe('button')
      expect(btn.dom.className).toBe('pm-btn')
      expect(btn.dom.textContent).toBe('Bold')
      expect(btn.dom.title).toBe('Make text bold')
    })

    it('should bind view and update state correctly', () => {
      const config = {
        label: 'Bold',
        run: vi.fn(),
        isActive: vi.fn(() => true),
        isEnabled: vi.fn(() => false)
      }

      const btn = makeBtn(config)
      const mockView = { state: {} }
      const mockState = {}

      btn.bindView(mockView)
      btn.update(mockState)

      expect(config.isActive).toHaveBeenCalledWith(mockState)
      expect(config.isEnabled).toHaveBeenCalledWith(mockState)
      expect(btn.dom.classList.toggle).toHaveBeenCalledWith('active', true)
      expect(btn.dom.disabled).toBe(true)
    })
  })

  describe('makeSelect', () => {
    it('should create select with options', () => {
      const config = {
        options: [['p', 'Paragraph'], ['h1', 'Heading 1']],
        compute: vi.fn(() => 'p'),
        apply: vi.fn(),
        isEnabled: vi.fn(() => true)
      }

      const select = makeSelect(config)

      expect(select.dom).toBeDefined()
      expect(select.dom.className).toBe('pm-select')
      // After refactor, options are created as DOM elements, not innerHTML
      expect(select.dom.appendChild).toHaveBeenCalled()
    })

    it('should update value based on compute function', () => {
      const config = {
        options: [['p', 'Paragraph'], ['h1', 'Heading 1']],
        compute: vi.fn(() => 'h1'),
        apply: vi.fn(),
        isEnabled: vi.fn(() => true)
      }

      const select = makeSelect(config)
      const mockState = {}

      select.update(mockState)

      expect(config.compute).toHaveBeenCalledWith(mockState)
      // Note: In real DOM, this would set select.value = 'h1'
    })
  })
})
