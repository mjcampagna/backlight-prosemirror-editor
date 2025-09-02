// Table row line breaks extension - handles double pipes as soft breaks
import { 
  hasDoublePipes, 
  convertDoublePipesToSoftBreaks, 
  convertSoftBreaksToDoublePipes,
  isTableRowText 
} from "../utils/patternUtils.js";

export const tableRowLineBreaksExtension = {
  name: "tableRowLineBreaks",
  
  md: {
    configureMarkdownIt(md) {
      // Pre-processing: Only process content that already contains double pipes
      // Don't convert regular multi-line table content
      md.core.ruler.before('inline', 'table_row_linebreaks_in', function(state) {
        // This rule is for handling existing double pipes in content
        // We'll handle this in post-processing instead
      });
      
      // Post-processing: convert double pipes to soft break tokens  
      md.core.ruler.after('inline', 'table_row_linebreaks_out', function(state) {
        const tokens = state.tokens;
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          
          if (token.type === 'inline' && token.children) {
            // Check if any text nodes contain table content with double pipes
            let hasTableWithBreaks = false;
            for (const child of token.children) {
              if (child.type === 'text' && isTableRowText(child.content) && hasDoublePipes(child.content)) {
                hasTableWithBreaks = true;
                break;
              }
            }
            
            if (hasTableWithBreaks) {
              // Process the children to convert double pipes to soft breaks
              const newChildren = [];
              
              for (const child of token.children) {
                if (child.type === 'text' && child.content.includes('||')) {
                  // Split on double pipes and create text + softbreak tokens
                  const parts = child.content.split(/\|\s*\|/);
                  
                  for (let j = 0; j < parts.length; j++) {
                    if (parts[j]) {
                      const textToken = new state.Token('text', '', 0);
                      textToken.content = parts[j];
                      newChildren.push(textToken);
                    }
                    
                    // Add softbreak between parts (except after the last part)
                    if (j < parts.length - 1) {
                      const softbreakToken = new state.Token('softbreak', 'br', 0);
                      newChildren.push(softbreakToken);
                    }
                  }
                } else {
                  newChildren.push(child);
                }
              }
              
              token.children = newChildren;
            }
          }
        }
      });
    }
  }
};
