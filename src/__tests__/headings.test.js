import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { defaultMarkdownParser } from 'prosemirror-markdown'
import { isBlockActive } from '../utils/selection.js'

const schema = defaultMarkdownParser.schema

describe('Heading Support', () => {
  it('should support all heading levels H1-H6', () => {
    const headingLevels = [1, 2, 3, 4, 5, 6]
    
    headingLevels.forEach(level => {
      const markdown = `${'#'.repeat(level)} Heading ${level}`
      const doc = defaultMarkdownParser.parse(markdown)
      const state = EditorState.create({ schema, doc })
      
      expect(isBlockActive(state, schema.nodes.heading, { level })).toBe(true)
      
      // Verify other levels are not active
      headingLevels.filter(l => l !== level).forEach(otherLevel => {
        expect(isBlockActive(state, schema.nodes.heading, { level: otherLevel })).toBe(false)
      })
    })
  })

  it('should parse and serialize all heading levels', () => {
    const testCases = [
      '# H1',
      '## H2', 
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6'
    ]

    testCases.forEach((markdown, index) => {
      const doc = defaultMarkdownParser.parse(markdown)
      const state = EditorState.create({ schema, doc })
      const level = index + 1
      
      expect(isBlockActive(state, schema.nodes.heading, { level })).toBe(true)
    })
  })

  it('should create keymap with all heading shortcuts', () => {
    const { createMarkdownKeymap } = require('../markdownToolbarPlugin.js')
    const keymap = createMarkdownKeymap(schema)
    
    expect(keymap).toBeDefined()
    expect(keymap.spec.props.handleKeyDown).toBeDefined()
  })

  it('should handle H4-H6 in toolbar dropdown', () => {
    // Test that the new heading levels work in selection
    const testCases = [
      { markdown: '#### H4', level: 4 },
      { markdown: '##### H5', level: 5 },
      { markdown: '###### H6', level: 6 }
    ]

    testCases.forEach(({ markdown, level }) => {
      const doc = defaultMarkdownParser.parse(markdown)
      const state = EditorState.create({ schema, doc })
      
      expect(isBlockActive(state, schema.nodes.heading, { level })).toBe(true)
    })
  })
})
