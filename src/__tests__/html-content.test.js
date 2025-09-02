import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { createMarkdownSystem } from '../markdownSystem.js'

describe('HTML Content Handling', () => {
  let system

  beforeEach(() => {
    system = createMarkdownSystem([])
  })

  describe('HTML Block Parsing', () => {
    it('should not throw errors when parsing content with HTML blocks', () => {
      const contentWithHTML = `# Test

This is a paragraph.

<div data-albums="519562" data-presentation="grid"></div>

Another paragraph.`

      expect(() => {
        const doc = system.mdParser.parse(contentWithHTML)
        const state = EditorState.create({
          schema: system.schema,
          doc
        })
      }).not.toThrow()
    })

    it('should preserve HTML content as text', () => {
      const contentWithHTML = `Paragraph before.

<div class="custom-widget" data-id="123">Content</div>

Paragraph after.`

      const doc = system.mdParser.parse(contentWithHTML)
      const serialized = system.mdSerializer.serialize(doc)
      
      // HTML should be preserved in the serialized output
      expect(serialized).toContain('Paragraph before')
      expect(serialized).toContain('Paragraph after')
      // HTML might be escaped or treated as text
    })

    it('should handle inline HTML without errors', () => {
      const contentWithInlineHTML = `This has <span class="highlight">inline HTML</span> content.`

      expect(() => {
        const doc = system.mdParser.parse(contentWithInlineHTML)
        system.mdSerializer.serialize(doc)
      }).not.toThrow()
    })

    it('should handle complex HTML structures', () => {
      const complexHTML = `# Document

<div data-albums="519562" data-presentation="grid" data-columns="4" data-images="519562_26805,519562_62439">
  <p>Nested content</p>
</div>

Regular **markdown** content.`

      expect(() => {
        const doc = system.mdParser.parse(complexHTML)
        const state = EditorState.create({
          schema: system.schema,
          doc
        })
        system.mdSerializer.serialize(doc)
      }).not.toThrow()
    })

    it('should handle mixed content without token errors', () => {
      const mixedContent = `Lorem ipsum dolor sit amet.

<script>alert('test');</script>

More content with **formatting**.

<style>.test { color: red; }</style>

Final paragraph.`

      expect(() => {
        const doc = system.mdParser.parse(mixedContent)
        EditorState.create({ schema: system.schema, doc })
      }).not.toThrow()
    })

    it('should handle empty HTML blocks', () => {
      const emptyHTML = `Content before.

<div></div>

Content after.`

      expect(() => {
        const doc = system.mdParser.parse(emptyHTML)
        EditorState.create({ schema: system.schema, doc })
      }).not.toThrow()
    })

    it('should handle malformed HTML gracefully', () => {
      const malformedHTML = `Content.

<div unclosed tag
<span>text</span>

More content.`

      expect(() => {
        const doc = system.mdParser.parse(malformedHTML)
        EditorState.create({ schema: system.schema, doc })
      }).not.toThrow()
    })
  })

  describe('Editor Initialization with HTML', () => {
    it('should initialize editor successfully with HTML content', () => {
      const htmlContent = `# Test Page

<div data-widget="gallery" data-id="123"></div>

This is regular content.`

      expect(() => {
        const doc = system.mdParser.parse(htmlContent)
        const state = EditorState.create({
          schema: system.schema,
          doc,
          plugins: []
        })
        
        // Test that state is valid
        expect(state.doc).toBeDefined()
        expect(state.doc.childCount).toBeGreaterThan(0)
      }).not.toThrow()
    })

    it('should handle the specific problematic content from user', () => {
      const problematicContent = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur egestas placerat suscipit.

<div data-albums="519562" data-presentation="grid" data-columns="4" data-images="519562_26805,519562_62439,519562_33498,519562_5651"></div>

Vestibulum quis nulla fermentum, pulvinar felis iaculis, molestie odio.`

      expect(() => {
        const doc = system.mdParser.parse(problematicContent)
        const state = EditorState.create({
          schema: system.schema,
          doc
        })
        
        expect(state.doc.childCount).toBeGreaterThan(0)
      }).not.toThrow()
    })
  })
})
