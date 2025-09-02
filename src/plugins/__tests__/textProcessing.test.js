import { describe, it, expect } from 'vitest'
import { createTextProcessingPlugin, presets } from '../textProcessing.js'
import { MarkdownSerializer } from 'prosemirror-markdown'
import { defaultMarkdownParser } from 'prosemirror-markdown'

describe('Text Processing Plugin', () => {
  const schema = defaultMarkdownParser.schema

  describe('createTextProcessingPlugin', () => {
    it('should create plugin with default options', () => {
      const plugin = createTextProcessingPlugin()
      
      expect(plugin.name).toBe('textProcessing')
      expect(typeof plugin.enhanceSerializer).toBe('function')
    })

    it('should unescape tildes by default', () => {
      const plugin = createTextProcessingPlugin()
      
      // Create a mock serializer
      const mockSerializer = {
        serialize: () => 'This \\~includes\\~ tildes'
      }
      
      const enhanced = plugin.enhanceSerializer(mockSerializer)
      const result = enhanced.serialize()
      
      expect(result).toBe('This ~includes~ tildes')
    })

    it('should handle custom characters', () => {
      const plugin = createTextProcessingPlugin({
        unescapeChars: ['~', '_']
      })
      
      const mockSerializer = {
        serialize: () => 'Text with \\~ and \\_ chars'
      }
      
      const enhanced = plugin.enhanceSerializer(mockSerializer)
      const result = enhanced.serialize()
      
      expect(result).toBe('Text with ~ and _ chars')
    })

    it('should apply custom replacements', () => {
      const plugin = createTextProcessingPlugin({
        customReplacements: [
          { from: '-->', to: '→' }
        ]
      })
      
      const mockSerializer = {
        serialize: () => 'Arrow --> here'
      }
      
      const enhanced = plugin.enhanceSerializer(mockSerializer)
      const result = enhanced.serialize()
      
      expect(result).toBe('Arrow → here')
    })

    it('should be disableable', () => {
      const plugin = createTextProcessingPlugin({ enabled: false })
      
      const mockSerializer = {
        serialize: () => 'This \\~stays\\~ escaped'
      }
      
      const enhanced = plugin.enhanceSerializer(mockSerializer)
      const result = enhanced.serialize()
      
      expect(result).toBe('This \\~stays\\~ escaped')
    })
  })

  describe('presets', () => {
    it('should provide tilde preset', () => {
      const plugin = presets.tildes()
      expect(plugin.name).toBe('textProcessing')
    })

    it('should provide disabled preset', () => {
      const plugin = presets.disabled()
      expect(plugin.name).toBe('textProcessing')
    })
  })
})
