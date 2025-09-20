// htmlLiteralStylingPlugin.js - GFM-compliant HTML block detection
import { createPatternNodeStylingPlugin } from "./patternNodeStylingPlugin.js";
import { getHtmlBlockStartType } from "./utils/gfmHtmlBlocks.js";

/**
 * GFM-compliant HTML detection function
 * Detects if content matches GFM HTML block start patterns
 */
function isGfmHtmlBlock(textContent) {
  const trimmed = textContent.trim();
  if (!trimmed) return false;
  
  // Check if this line would start an HTML block according to GFM spec
  return getHtmlBlockStartType(trimmed) !== null;
}

export function htmlLiteralStylingPlugin(options = {}) {
  const className = options.className || "pm-html-literal";
  const includeHeadings = !!options.includeHeadings;

  // Use the pattern utility with GFM-compliant detection
  return createPatternNodeStylingPlugin({
    pattern: isGfmHtmlBlock,
    className,
    pluginKey: "html-literal-styling",
    nodeTypes: includeHeadings ? ["paragraph", "heading"] : ["paragraph"],
    excludeTypes: ["code_block"]
  });
}

export default htmlLiteralStylingPlugin;
