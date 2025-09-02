// Table row unification extension - unifies table rows into single paragraphs with line breaks
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
                // Create a single paragraph with hard breaks between table rows
                const openToken = new state.Token('paragraph_open', 'p', 1);
                openToken.map = token.map;
                
                const contentToken = new state.Token('inline', '', 0);
                
                // Build children tokens with text and hard breaks
                const children = [];
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                  const line = lines[lineIndex];
                  
                  // Add text token for this line
                  const textToken = new state.Token('text', '', 0);
                  textToken.content = line;
                  children.push(textToken);
                  
                  // Add hard break between lines (except after the last line)
                  if (lineIndex < lines.length - 1) {
                    const hardbreakToken = new state.Token('hardbreak', 'br', 0);
                    children.push(hardbreakToken);
                  }
                }
                
                contentToken.children = children;
                contentToken.content = ''; // Clear content to avoid duplication - children will handle the content
                contentToken.map = inlineToken.map;
                
                const closeToken = new state.Token('paragraph_close', 'p', -1);
                
                newTokens.push(openToken, contentToken, closeToken);
                
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
