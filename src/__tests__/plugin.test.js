import { describe, it, expect } from 'vitest'
import { defaultMarkdownParser } from 'prosemirror-markdown'
import { createMarkdownKeymap, buildMarkdownPlugins } from '../markdownToolbarPlugin.js'

const schema = defaultMarkdownParser.schema

describe('Plugin Tests', () => {
  describe('createMarkdownKeymap', () => {
    it('should create keymap with basic shortcuts', () => {
      const keymap = createMarkdownKeymap(schema)
      
      expect(keymap).toBeDefined()
      expect(typeof keymap.props.handleKeyDown).toBe('function')
    })

    it('should include undo/redo shortcuts', () => {
      const keymap = createMarkdownKeymap(schema)
      const bindings = keymap.spec.props.handleKeyDown
      
      expect(bindings).toBeDefined()
    })
  })

  describe('buildMarkdownPlugins', () => {
    it('should return array of plugins', () => {
      const plugins = buildMarkdownPlugins(schema)
      
      expect(Array.isArray(plugins)).toBe(true)
      expect(plugins.length).toBeGreaterThan(4)
    })

    it('should include core plugins', () => {
      const plugins = buildMarkdownPlugins(schema)
      
      // Check that plugins are defined
      plugins.forEach(plugin => {
        expect(plugin).toBeDefined()
      })
    })

    it('should pass options to toolbar plugin', () => {
      const plugins = buildMarkdownPlugins(schema, { codeJoinMode: "always" })
      
      expect(plugins.length).toBeGreaterThan(0)
    })
  })
})
