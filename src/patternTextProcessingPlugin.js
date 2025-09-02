// Pattern-based text processing plugin for conditional character unescaping

/**
 * Creates a text processing plugin that conditionally unescapes characters
 * based on line pattern matching.
 * 
 * @param {Object} options - Configuration options
 * @param {RegExp} options.pattern - Regex pattern to match lines that should have unescaping applied
 * @param {string[]} [options.unescapeChars] - Characters to unescape in matching lines (default: ['|'])
 * @param {Object[]} [options.customReplacements] - Additional replacements for matching lines
 * @param {boolean} [options.enabled] - Whether the plugin is enabled (default: true)
 * @param {string[]} [options.globalUnescapeChars] - Characters to unescape everywhere (default: [])
 * 
 * @returns {Object} Text processing plugin
 */
export function createPatternTextProcessingPlugin(options = {}) {
  const {
    pattern,
    unescapeChars = ['|'],
    customReplacements = [],
    enabled = true,
    globalUnescapeChars = []
  } = options;

  if (!pattern) {
    throw new Error("'pattern' option is required");
  }

  return {
    name: "patternTextProcessing",
    
    // Apply post-processing to markdown serializer
    enhanceSerializer(mdSerializer) {
      if (!enabled) return mdSerializer;

      const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
      mdSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Process globally unescaped characters everywhere
        for (const char of globalUnescapeChars) {
          const escapedChar = `\\${char}`;
          const regex = new RegExp(escapedChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          result = result.replace(regex, char);
        }
        
        // Process pattern-specific unescaping line by line
        const lines = result.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this line matches our pattern
          if (pattern.test(line)) {
            let processedLine = line;
            
            // Unescape specified characters in matching lines
            for (const char of unescapeChars) {
              const escapedChar = `\\${char}`;
              const regex = new RegExp(escapedChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              processedLine = processedLine.replace(regex, char);
            }
            
            // Apply custom replacements to matching lines
            for (const { from, to } of customReplacements) {
              if (typeof from === 'string') {
                processedLine = processedLine.replace(new RegExp(from, 'g'), to);
              } else if (from instanceof RegExp) {
                processedLine = processedLine.replace(from, to);
              }
            }
            
            lines[i] = processedLine;
          }
        }
        
        result = lines.join('\n');
        return result;
      };

      return mdSerializer;
    }
  };
}

// Convenience function for creating table row text processing specifically
export function createTableRowTextProcessingPlugin(options = {}) {
  const {
    unescapeChars = ['|', '*', '_'], // Common characters that should not be escaped in table rows
    customReplacements = []
  } = options;

  // Pattern: starts with |, ends with | (ignoring trailing spaces)
  const tableRowPattern = /^\|.*\|\s*$/;

  return createPatternTextProcessingPlugin({
    pattern: tableRowPattern,
    unescapeChars,
    customReplacements,
    globalUnescapeChars: ['~'] // Keep existing tilde unescaping everywhere
  });
}

export default createPatternTextProcessingPlugin;
