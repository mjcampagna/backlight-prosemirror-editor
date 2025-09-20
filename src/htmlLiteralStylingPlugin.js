// htmlLiteralStylingPlugin.js - GFM-compliant HTML block detection
import { createPatternNodeStylingPlugin } from "./patternNodeStylingPlugin.js";
import { getHtmlBlockStartType } from "./utils/gfmHtmlBlocks.js";

/**
 * Pure GFM HTML block detection
 * Only highlights content that starts an HTML block per GFM specification
 */
function isGfmHtmlBlock(textContent) {
  if (!textContent) return false;
  
  // Pure GFM compliance - use raw text to preserve indentation context
  return getHtmlBlockStartType(textContent) !== null;
}

export function htmlLiteralStylingPlugin(options = {}) {
  const className = options.className || "pm-html-literal";
  const includeHeadings = !!options.includeHeadings;

  // Single plugin for GFM HTML block detection
  return createPatternNodeStylingPlugin({
    pattern: isGfmHtmlBlock,
    className,
    pluginKey: "html-literal-styling",
    nodeTypes: includeHeadings ? ["paragraph", "heading"] : ["paragraph"],
    excludeTypes: ["code_block"]
  });
}

export default htmlLiteralStylingPlugin;
