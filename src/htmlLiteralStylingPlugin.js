// htmlLiteralStylingPlugin.js - refactored to use pattern utility
import { createPatternNodeStylingPlugin } from "./patternNodeStylingPlugin.js";

/**
 * Heuristic: a paragraph (or heading if enabled) is "HTML-only" if its textContent
 * is whitespace + one or more HTML-ish tags/comments/doctypes, with nothing else.
 */
const HTML_ONLY_RE =
  /^(?:\s*(?:<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\?[\s\S]*?\?>|<\/?\w[\s\S]*?>)\s*)+$/i;

export function htmlLiteralStylingPlugin(options = {}) {
  const className = options.className || "pm-html-literal";
  const includeHeadings = !!options.includeHeadings;

  // Use the pattern utility for the core functionality
  return createPatternNodeStylingPlugin({
    pattern: HTML_ONLY_RE,
    className,
    pluginKey: "html-literal-styling",
    nodeTypes: includeHeadings ? ["paragraph", "heading"] : ["paragraph"],
    excludeTypes: ["code_block"]
  });
}

export default htmlLiteralStylingPlugin;
