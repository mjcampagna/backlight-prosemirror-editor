import { describe, it, expect, vi } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { defaultMarkdownParser } from 'prosemirror-markdown'
import { outdentCommand, applyListUnified, applyBlockquoteUnified } from '../unified.js'

const schema = defaultMarkdownParser.schema

// Mock the complex window operations
vi.mock('../list.js', () => ({
  outdentAllListItemsInWindow: vi.fn(),
  mergeListsAcrossWindow: vi.fn(),
  retargetListsInWindow: vi.fn(),
  wrapAllNonListBlocksInWindow: vi.fn(),
  liftListItemsAcrossSelection: vi.fn()
}))

vi.mock('../block.js', () => ({
  wrapAllBlocksNotInAncestorWindow: vi.fn(),
  wrapListsInBlockquoteAcrossWindow: vi.fn(),
  liftAcrossSelection: vi.fn(() => true)
}))

vi.mock('../../utils/selection.js', async () => {
  const actual = await vi.importActual('../../utils/selection.js')
  return {
    ...actual,
    reselectWindow: vi.fn()
  }
})

describe('Unified Commands', () => {
  describe('outdentCommand', () => {
    it('should return command function', () => {
      const listItemType = schema.nodes.list_item
      const command = outdentCommand(listItemType)
      
      expect(typeof command).toBe('function')
    })

    it('should return false without view', () => {
      const listItemType = schema.nodes.list_item
      const command = outdentCommand(listItemType)
      const state = EditorState.create({ schema })
      
      expect(command(state, null, null)).toBe(false)
    })
  })

  describe('applyListUnified', () => {
    it('should return command function', () => {
      const { bullet_list, list_item } = schema.nodes
      const command = applyListUnified(bullet_list, list_item)
      
      expect(typeof command).toBe('function')
    })

    it('should return false without view', () => {
      const { bullet_list, list_item } = schema.nodes
      const command = applyListUnified(bullet_list, list_item)
      const state = EditorState.create({ schema })
      
      expect(command(state, null, null)).toBe(false)
    })
  })

  describe('applyBlockquoteUnified', () => {
    it('should return command function', () => {
      const command = applyBlockquoteUnified(schema.nodes.blockquote)
      
      expect(typeof command).toBe('function')
    })

    it('should return false without view', () => {
      const command = applyBlockquoteUnified(schema.nodes.blockquote)
      const state = EditorState.create({ schema })
      
      expect(command(state, null, null)).toBe(false)
    })
  })
})
