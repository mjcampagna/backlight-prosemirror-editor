// Table row splitting extension - splits combined table rows into separate paragraphs
import { isTableRowText } from "../utils/patternUtils.js";

export const tableRowSplittingExtension = {
  name: "tableRowSplitting",
  
  md: {
    configureMarkdownIt(md) {
      // Post-processing: split table rows that got combined into single paragraphs
      md.core.ruler.after('block', 'table_row_splitting', function(state) {
        const tokens = state.tokens;
        const newTokens = [];
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          
          // Check if this is a paragraph with inline content that contains multiple table rows
          if (token.type === 'paragraph_open' && 
              tokens[i + 1] && 
              tokens[i + 1].type === 'inline' &&
              tokens[i + 2] &&
              tokens[i + 2].type === 'paragraph_close') {
            
            const inlineToken = tokens[i + 1];
            const content = inlineToken.content;
            
            // Check if content contains multiple table rows (indicated by line breaks)
            const lines = content.split('\n');
            
            if (lines.length > 1) {
              // Check if all lines are table rows
              const allTableRows = lines.every(line => {
                const trimmed = line.trim();
                return trimmed && isTableRowText(trimmed);
              });
              
              if (allTableRows) {
                // Split into separate paragraph tokens for each table row
                for (const line of lines) {
                  const openToken = new state.Token('paragraph_open', 'p', 1);
                  openToken.map = token.map;
                  
                  const contentToken = new state.Token('inline', '', 0);
                  contentToken.content = line;
                  contentToken.map = inlineToken.map;
                  contentToken.children = []; // Will be populated by inline parser
                  
                  const closeToken = new state.Token('paragraph_close', 'p', -1);
                  
                  newTokens.push(openToken, contentToken, closeToken);
                }
                
                // Skip the original paragraph tokens
                i += 2; // Skip inline and paragraph_close
                continue;
              }
            }
          }
          
          newTokens.push(token);
        }
        
        state.tokens = newTokens;
      });
    }
  }
};
