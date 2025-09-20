// GFM Tagfilter extension - filters disallowed HTML tags per GFM spec
// https://github.github.com/gfm/#disallowed-raw-html-extension-

/**
 * List of HTML tags that are disallowed in GFM and should be filtered
 * by replacing the opening < with &lt;
 */
const DISALLOWED_TAGS = [
  'title',
  'textarea', 
  'style',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'script',
  'plaintext'
];

/**
 * Creates a regex to match opening tags for disallowed HTML elements
 * Matches both self-closing and regular opening tags
 */
function createDisallowedTagRegex() {
  const tagPattern = DISALLOWED_TAGS.join('|');
  // Match opening tags: <tag> or <tag attr="value"> or <tag/>
  // Case insensitive matching per GFM spec
  // Capture the full opening tag including attributes
  return new RegExp(`<(${tagPattern})((?:\\s[^>]*)?)(/??)>`, 'gi');
}

/**
 * Filter function that replaces disallowed HTML tags with escaped versions
 * @param {string} text - The text content to filter
 * @returns {string} - Text with disallowed tags escaped
 */
function filterDisallowedTags(text) {
  const regex = createDisallowedTagRegex();
  return text.replace(regex, '&lt;$1$2$3>');
}

/**
 * Create a tagfilter text processing plugin that works like the existing textProcessing plugin
 * @param {Object} options - Configuration options
 * @returns {Object} - Text processing plugin
 */
function createTagfilterTextProcessingPlugin() {
  return {
    name: "tagfilterTextProcessing", 
    enhanceSerializer(mdSerializer) {
      // Wrap the serialize method to apply tagfilter after serialization
      const originalSerialize = mdSerializer.serialize.bind(mdSerializer);
      mdSerializer.serialize = function(content, options) {
        let result = originalSerialize(content, options);
        
        // Apply tagfilter to the serialized markdown text
        result = filterDisallowedTags(result);
        
        return result;
      };
      
      return mdSerializer;
    }
  };
}

/**
 * GFM Tagfilter extension for the markdown system
 * 
 * Since this system has HTML parsing disabled, the tagfilter works at the 
 * serialization level - when markdown is serialized back to text, we filter
 * any disallowed HTML tags that might be present.
 */
export const tagfilterExtension = {
  name: "tagfilter"
};

// Export utilities for testing and integration
export { DISALLOWED_TAGS, filterDisallowedTags, createTagfilterTextProcessingPlugin };
