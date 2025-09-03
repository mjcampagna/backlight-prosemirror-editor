// Pattern-based text processing plugin for conditional character unescaping
import { createSafeRegexTester, TABLE_ROW_PATTERN, getUnescapeRegex, getDoubleUnescapeRegex, isTableRowText } from "./utils/patternUtils.js";

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

  // Create safe pattern tester and pre-compile character regexes
  const safePatternTest = createSafeRegexTester(pattern);
  const globalUnescapeRegexes = globalUnescapeChars.map(getUnescapeRegex);
  const patternUnescapeRegexes = unescapeChars.map(getUnescapeRegex);
  const patternDoubleUnescapeRegexes = unescapeChars.map(getDoubleUnescapeRegex);

  return {
    name: "patternTextProcessing",
    
    // Apply post-processing to markdown serializer
    enhanceSerializer(mdSerializer) {
      if (!enabled) return mdSerializer;
      
      // Guard against double wrapping
      if (mdSerializer.__patternTextProcessingPatched) return mdSerializer;
      mdSerializer.__patternTextProcessingPatched = true;

      const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
      mdSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Process globally unescaped characters everywhere using pre-compiled regexes
        for (let i = 0; i < globalUnescapeChars.length; i++) {
          const char = globalUnescapeChars[i];
          const regex = globalUnescapeRegexes[i];
          result = result.replace(regex, char);
        }
        
        // Process pattern-specific unescaping line by line
        const lines = result.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if this line matches our pattern using safe tester
          if (safePatternTest(line)) {
            let processedLine = line;
            
            // Unescape specified characters in matching lines using pre-compiled regexes
            // Handle both single and double escaping
            for (let j = 0; j < unescapeChars.length; j++) {
              const char = unescapeChars[j];
              const doubleRegex = patternDoubleUnescapeRegexes[j];
              const singleRegex = patternUnescapeRegexes[j];
              
              // First handle double escapes (\\|), then single escapes (\|)
              processedLine = processedLine.replace(doubleRegex, char);
              processedLine = processedLine.replace(singleRegex, char);
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
    customReplacements = [],
    handleSoftBreaks = true // Whether to convert soft breaks to line breaks in markdown output
  } = options;

  const basePlugin = createPatternTextProcessingPlugin({
    pattern: TABLE_ROW_PATTERN,
    unescapeChars,
    customReplacements,
    globalUnescapeChars: ['~'] // Keep existing tilde unescaping everywhere
  });

  if (!handleSoftBreaks) {
    return basePlugin;
  }

  // Enhance the base plugin to also handle soft break conversion
  return {
    name: "tableRowTextProcessingWithSoftBreaks",
    
    enhanceSerializer(mdSerializer) {
      // Note: We assume the plugin is enabled since this is a convenience wrapper
      
      // First apply the base pattern processing
      let enhancedSerializer = basePlugin.enhanceSerializer(mdSerializer);
      
      // Guard against double wrapping for soft breaks
      if (enhancedSerializer.__tableRowSoftBreaksPatched) return enhancedSerializer;
      enhancedSerializer.__tableRowSoftBreaksPatched = true;

      const originalSerialize = enhancedSerializer.serialize.bind(enhancedSerializer);
      enhancedSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Convert hard breaks within table content to actual line breaks in markdown
        // This specifically handles the \\ + \n pattern from ProseMirror hard breaks
        result = result.replace(/(\|[^|\n]*)\\\n([^|\n]*\|)/g, '$1\n$2');
        
        return result;
      };

      return enhancedSerializer;
    }
  };
}

export default createPatternTextProcessingPlugin;
