import { describe, it, expect } from 'vitest'
import { createMarkdownSystem } from './markdownSystem.js'
import { strikethroughExtension } from './extensions/strikethrough.js'

describe('Markdown System', () => {
  it('should create system with base schema', () => {
    const system = createMarkdownSystem([])
    
    expect(system.schema).toBeDefined()
    expect(system.mdParser).toBeDefined()
    expect(system.mdSerializer).toBeDefined()
    expect(system.keymapPlugins).toBeInstanceOf(Array)
  })

  it('should integrate extensions', () => {
    const system = createMarkdownSystem([strikethroughExtension])
    
    expect(system.schema.marks.strikethrough).toBeDefined()
    expect(system.keymapPlugins.length).toBeGreaterThan(0)
  })

  it('should parse and serialize markdown', () => {
    const system = createMarkdownSystem([])
    const markdown = '# Hello\n\nThis is **bold** text.'
    
    const doc = system.mdParser.parse(markdown)
    const serialized = system.mdSerializer.serialize(doc)
    
    expect(doc).toBeDefined()
    expect(serialized).toContain('Hello')
    expect(serialized).toContain('**bold**')
  })

  it('should include extension marks in schema', () => {
    const system = createMarkdownSystem([strikethroughExtension])
    
    expect(system.schema.marks.strikethrough).toBeDefined()
    expect(system.schema.marks.strikethrough.spec.parseDOM).toBeDefined()
  })
})
