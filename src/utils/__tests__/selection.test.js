import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { defaultMarkdownParser } from 'prosemirror-markdown'
import { 
  hasAncestorOfType, 
  hasAnyListAncestor, 
  isMarkActive, 
  isBlockActive,
  selectionAllInAncestorType,
  selectionHasAnyNonListTextblock 
} from '../selection.js'

const schema = defaultMarkdownParser.schema

describe('Selection Utilities', () => {
  describe('hasAncestorOfType', () => {
    it('should detect blockquote ancestor', () => {
      const doc = defaultMarkdownParser.parse('> test')
      const state = EditorState.create({ schema, doc })
      const $pos = state.doc.resolve(3) // inside blockquote
      
      expect(hasAncestorOfType($pos, schema.nodes.blockquote)).toBe(true)
      expect(hasAncestorOfType($pos, schema.nodes.code_block)).toBe(false)
    })
  })

  describe('hasAnyListAncestor', () => {
    it('should detect list ancestor', () => {
      const doc = defaultMarkdownParser.parse('- item')
      const state = EditorState.create({ schema, doc })
      const $pos = state.doc.resolve(3) // inside list item
      
      expect(hasAnyListAncestor($pos, schema)).toBe(true)
    })

    it('should return false for non-list content', () => {
      const doc = defaultMarkdownParser.parse('paragraph')
      const state = EditorState.create({ schema, doc })
      const $pos = state.doc.resolve(3)
      
      expect(hasAnyListAncestor($pos, schema)).toBe(false)
    })
  })

  describe('isMarkActive', () => {
    it('should return false for inactive marks', () => {
      const doc = defaultMarkdownParser.parse('plain text')
      const state = EditorState.create({ schema, doc })
      
      expect(isMarkActive(state, schema.marks.strong)).toBe(false)
      expect(isMarkActive(state, schema.marks.em)).toBe(false)
    })
  })

  describe('isBlockActive', () => {
    it('should detect active heading', () => {
      const doc = defaultMarkdownParser.parse('# Heading')
      const state = EditorState.create({ schema, doc })
      
      expect(isBlockActive(state, schema.nodes.heading, { level: 1 })).toBe(true)
      expect(isBlockActive(state, schema.nodes.heading, { level: 2 })).toBe(false)
    })
  })

  describe('selectionAllInAncestorType', () => {
    it('should return true when all selection is in blockquote', () => {
      const doc = defaultMarkdownParser.parse('> line 1\n> line 2')
      const state = EditorState.create({ 
        schema, 
        doc,
        selection: state => ({
          from: 1,
          to: doc.content.size - 1
        })
      })
      
      expect(selectionAllInAncestorType(state, schema.nodes.blockquote)).toBe(true)
    })
  })
})
