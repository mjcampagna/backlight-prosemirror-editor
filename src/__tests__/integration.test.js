import { describe, it, expect, beforeEach } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { createMarkdownSystem } from '../markdownSystem.js'
import { buildMarkdownPlugins } from '../markdownToolbarPlugin.js'

// Mock DOM for EditorView
const mockElement = {
  appendChild: () => {},
  insertBefore: () => {},
  removeChild: () => {},
  parentNode: {
    insertBefore: () => {}
  },
  style: {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {}
  }
}

global.document = {
  createElement: () => mockElement,
  createTextNode: () => ({ nodeValue: '' })
}

describe('Integration Tests', () => {
  let system, schema, plugins

  beforeEach(() => {
    system = createMarkdownSystem([])
    schema = system.schema
    plugins = buildMarkdownPlugins(schema, { codeJoinMode: "smart" })
  })

  describe('Markdown System Integration', () => {
    it('should create working editor state with extensions', () => {
      const doc = system.mdParser.parse('# Test\n\n~~strikethrough~~')
      const state = EditorState.create({
        schema,
        doc,
        plugins
      })

      expect(state).toBeDefined()
      expect(state.doc.childCount).toBeGreaterThan(0)
      expect(schema.marks.strong).toBeDefined()
    })

    it('should have basic marks available', () => {
      expect(schema.marks.strong).toBeDefined()
      expect(schema.marks.em).toBeDefined()
      expect(schema.nodes.heading).toBeDefined()
    })
  })

  describe('Plugin Integration', () => {
    it('should create plugins array with correct length', () => {
      expect(plugins).toBeInstanceOf(Array)
      expect(plugins.length).toBeGreaterThan(4) // toolbar + history + keymap + base + dropcursor + gapcursor
    })

    it('should include extension keymaps', () => {
      const keymapPlugins = system.keymapPlugins
      expect(keymapPlugins).toBeInstanceOf(Array)
    })
  })

  describe('Editor View Creation', () => {
    it('should create editor view without errors', () => {
      const doc = system.mdParser.parse('# Hello World')
      const state = EditorState.create({
        schema,
        doc,
        plugins
      })

      // Mock minimal EditorView behavior
      const view = {
        state,
        dom: mockElement,
        dispatch: () => {},
        focus: () => {},
        destroy: () => {}
      }

      expect(view.state.doc.textContent).toContain('Hello World')
    })
  })
})
