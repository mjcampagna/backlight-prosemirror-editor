// Text processing plugin for markdown serialization customization

export function createTextProcessingPlugin(options = {}) {
  const {
    unescapeChars = ['~'], // Characters to unescape by default
    customReplacements = [], // Additional custom replacements
    enabled = true
  } = options;

  return {
    name: "textProcessing",
    
    // Apply post-processing to markdown serializer
    enhanceSerializer(mdSerializer) {
      if (!enabled) return mdSerializer;

      const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
      mdSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Unescape specified characters
        for (const char of unescapeChars) {
          const escapedChar = `\\${char}`;
          const regex = new RegExp(escapedChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          result = result.replace(regex, char);
        }
        
        // Apply custom replacements
        for (const { from, to } of customReplacements) {
          if (typeof from === 'string') {
            result = result.replace(new RegExp(from, 'g'), to);
          } else if (from instanceof RegExp) {
            result = result.replace(from, to);
          }
        }
        
        return result;
      };

      return mdSerializer;
    }
  };
}

// Preset configurations
export const presets = {
  // Default: just unescape tildes
  tildes: () => createTextProcessingPlugin({ 
    unescapeChars: ['~'] 
  }),
  
  // Unescape multiple characters
  relaxed: () => createTextProcessingPlugin({ 
    unescapeChars: ['~', '_', '*'] // Be careful with * and _ as they're meaningful
  }),
  
  // Custom example: convert arrows
  arrows: () => createTextProcessingPlugin({
    unescapeChars: ['~'],
    customReplacements: [
      { from: '-->', to: '→' },
      { from: '<--', to: '←' },
      { from: '<==>', to: '↔' }
    ]
  }),
  
  // Disabled
  disabled: () => createTextProcessingPlugin({ enabled: false })
};

// Default export for easy usage
export default presets.tildes;
