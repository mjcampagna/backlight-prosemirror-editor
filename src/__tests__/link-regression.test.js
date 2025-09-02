import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { createMarkdownSystem } from '../markdownSystem.js'

describe('Link Functionality Regression Tests', () => {
  let system, schema

  beforeEach(() => {
    system = createMarkdownSystem([])
    schema = system.schema
  })

  describe('Core Link Support', () => {
    it('should have link mark in schema', () => {
      expect(schema.marks.link).toBeDefined()
      expect(schema.marks.link.spec.attrs.href).toBeDefined()
    })

    it('should parse markdown links correctly', () => {
      const markdown = 'Visit [Google](https://google.com) and [GitHub](https://github.com)'
      const doc = system.mdParser.parse(markdown)
      const serialized = system.mdSerializer.serialize(doc)
      
      expect(serialized).toContain('[Google](https://google.com)')
      expect(serialized).toContain('[GitHub](https://github.com)')
    })

    it('should preserve link formatting during mode switching', () => {
      const markdown = 'Check out [Example](https://example.com) site'
      const doc = system.mdParser.parse(markdown)
      
      // Should parse without errors
      expect(doc).toBeDefined()
      expect(doc.textContent).toContain('Example')
      
      // Should serialize back correctly
      const serialized = system.mdSerializer.serialize(doc)
      expect(serialized).toContain('[Example](https://example.com)')
    })
  })

  describe('Link Mark Detection', () => {
    it('should detect links in document structure', () => {
      const markdown = 'Visit [Google](https://google.com) now'
      const doc = system.mdParser.parse(markdown)
      
      let linkFound = false
      let linkText = ''
      let linkUrl = ''
      
      doc.descendants((node) => {
        if (node.isText && node.marks.length > 0) {
          const linkMark = node.marks.find(mark => mark.type === schema.marks.link)
          if (linkMark) {
            linkFound = true
            linkText = node.textContent
            linkUrl = linkMark.attrs.href
          }
        }
      })
      
      expect(linkFound).toBe(true)
      expect(linkText).toBe('Google')
      expect(linkUrl).toBe('https://google.com')
    })
  })

  describe('Link Creation Scenarios', () => {
    it('should handle empty link text gracefully', () => {
      const markdown = 'Visit [] now'
      const doc = system.mdParser.parse(markdown)
      
      // Should not crash on empty link text
      expect(doc).toBeDefined()
    })

    it('should handle links with special characters', () => {
      const markdown = 'Visit [Test & Demo](https://example.com?test=1&demo=2) site'
      const doc = system.mdParser.parse(markdown)
      const serialized = system.mdSerializer.serialize(doc)
      
      expect(serialized).toContain('Test & Demo')
      expect(serialized).toContain('https://example.com?test=1&demo=2')
    })

    it('should handle multiple links in same paragraph', () => {
      const markdown = 'Visit [Google](https://google.com) and [GitHub](https://github.com) today'
      const doc = system.mdParser.parse(markdown)
      
      let linkCount = 0
      doc.descendants((node) => {
        if (node.isText && node.marks.some(mark => mark.type === schema.marks.link)) {
          linkCount++
        }
      })
      
      expect(linkCount).toBe(2)
    })
  })

  describe('Edge Cases Protection', () => {
    it('should handle malformed markdown links', () => {
      const markdown = 'Visit [incomplete link and [Google](https://google.com)'
      
      expect(() => {
        const doc = system.mdParser.parse(markdown)
        system.mdSerializer.serialize(doc)
      }).not.toThrow()
    })

    it('should handle nested formatting in links', () => {
      const markdown = 'Visit [**Bold Link**](https://example.com) text'
      const doc = system.mdParser.parse(markdown)
      const serialized = system.mdSerializer.serialize(doc)
      
      expect(serialized).toContain('Bold Link')
      expect(serialized).toContain('https://example.com')
    })
  })

  describe('Toolbar Integration Protection', () => {
    it('should have link mark available for toolbar', () => {
      expect(schema.marks.link).toBeDefined()
      expect(typeof schema.marks.link.create).toBe('function')
    })

    it('should support link mark creation with attributes', () => {
      const linkMark = schema.marks.link.create({
        href: 'https://example.com',
        title: 'Example Site'
      })
      
      expect(linkMark.attrs.href).toBe('https://example.com')
      expect(linkMark.attrs.title).toBe('Example Site')
    })
  })
})
