import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { createMarkdownSystem } from '../markdownSystem.js'

describe('Link Support', () => {
  let system, schema

  beforeEach(() => {
    system = createMarkdownSystem([])
    schema = system.schema
  })

  describe('Schema Link Support', () => {
    it('should have link mark in schema', () => {
      expect(schema.marks.link).toBeDefined()
    })

    it('should parse markdown links', () => {
      const markdown = 'This is [a link](https://example.com) in text.'
      const doc = system.mdParser.parse(markdown)
      
      expect(doc).toBeDefined()
      expect(doc.textContent).toContain('a link')
    })

    it('should serialize links back to markdown', () => {
      const markdown = 'Check out [Google](https://google.com) for search.'
      const doc = system.mdParser.parse(markdown)
      const serialized = system.mdSerializer.serialize(doc)
      
      expect(serialized).toContain('[Google](https://google.com)')
    })

    it('should handle links with titles', () => {
      const markdown = 'Visit [Example](https://example.com "Example title") site.'
      const doc = system.mdParser.parse(markdown)
      const serialized = system.mdSerializer.serialize(doc)
      
      expect(serialized).toContain('Example')
      expect(serialized).toContain('https://example.com')
    })
  })

  describe('Link Mark Properties', () => {
    it('should have proper link mark spec', () => {
      const linkMark = schema.marks.link
      
      expect(linkMark.spec.attrs).toBeDefined()
      expect(linkMark.spec.attrs.href).toBeDefined()
    })
  })
})
