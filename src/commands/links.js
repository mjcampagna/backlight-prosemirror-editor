// Link commands and utilities

// Check if selection has link mark
export function hasLink(state) {
  const { link } = state.schema.marks;
  if (!link) return false;
  
  const { from, to, empty } = state.selection;
  if (empty) {
    const storedMarks = state.storedMarks || state.selection.$from.marks();
    const hasStoredLink = Boolean(link.isInSet(storedMarks));
    
    // If no stored marks, check adjacent positions for link detection at boundaries
    if (!hasStoredLink) {
      // Check position before cursor
      if (from > 0) {
        const $prev = state.doc.resolve(from - 1);
        if (link.isInSet($prev.marks())) {
          return true;
        }
      }
      
      // Check position after cursor (for start of link)
      if (from < state.doc.content.size) {
        const $next = state.doc.resolve(from);
        if (link.isInSet($next.marks())) {
          return true;
        }
        
        // Check one position ahead for immediate adjacency
        if (from + 1 < state.doc.content.size) {
          const $nextPos = state.doc.resolve(from + 1);
          if (link.isInSet($nextPos.marks())) {
            return true;
          }
        }
      }
    }
    
    return hasStoredLink;
  }
  
  return Boolean(state.doc.rangeHasMark(from, to, link));
}

// Get link attributes from current selection  
export function getLinkAttrs(state) {
  const { link } = state.schema.marks;
  if (!link) return null;
  
  const { from, $from } = state.selection;
  
  // Try current position first
  let mark = link.isInSet($from.marks());
  
  // If not found, try adjacent positions (for boundary cases)
  if (!mark && from > 0) {
    const $prev = state.doc.resolve(from - 1);
    mark = link.isInSet($prev.marks());
  }
  
  if (!mark && from < state.doc.content.size) {
    const $next = state.doc.resolve(from);  
    mark = link.isInSet($next.marks());
  }
  
  // Check one position ahead for immediate adjacency (matches hasLink logic)
  if (!mark && from + 1 < state.doc.content.size) {
    const $nextPos = state.doc.resolve(from + 1);
    mark = link.isInSet($nextPos.marks());
  }
  
  return mark ? mark.attrs : null;
}

// Extract full link text by finding the containing text node
export function getLinkText(state) {
  const { link } = state.schema.marks;
  if (!link || !hasLink(state)) return "";
  
  const { from, $from } = state.selection;
  
  // Get the link mark from current position or adjacent positions
  let linkMark = link.isInSet($from.marks());
  let searchPos = $from;
  
  // If not found at current position, check adjacent positions
  if (!linkMark && from > 0) {
    const $prev = state.doc.resolve(from - 1);
    linkMark = link.isInSet($prev.marks());
    if (linkMark) searchPos = $prev;
  }
  
  if (!linkMark && from < state.doc.content.size) {
    const $next = state.doc.resolve(from);
    linkMark = link.isInSet($next.marks());
    if (linkMark) searchPos = $next;
  }
  
  // Check one position ahead for immediate adjacency (matches hasLink logic)
  if (!linkMark && from + 1 < state.doc.content.size) {
    const $nextPos = state.doc.resolve(from + 1);
    linkMark = link.isInSet($nextPos.marks());
    if (linkMark) searchPos = $nextPos;
  }
  
  if (!linkMark) return "";
  
  // Find the text node that contains this position and has the link mark
  const parentOffset = searchPos.parentOffset;
  const parent = searchPos.parent;
  
  // Look for the text node at or around this position
  let targetNode = null;
  let nodeStart = 0;
  
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const nodeEnd = nodeStart + child.nodeSize;
    
    // Check if cursor is within this node's range
    if (parentOffset >= nodeStart && parentOffset <= nodeEnd) {
      // Check if this node has the same link mark
      if (child.isText && link.isInSet(child.marks)) {
        const childLinkMark = link.isInSet(child.marks);
        if (childLinkMark && childLinkMark.attrs.href === linkMark.attrs.href) {
          targetNode = child;
          break;
        }
      }
    }
    
    nodeStart = nodeEnd;
  }
  
  return targetNode ? targetNode.textContent : "";
}

// Extract word at cursor position (for unlinked text)
export function getWordAtCursor(state) {
  const { $from } = state.selection;
  const { empty } = state.selection;
  
  if (!empty) return ""; // Only for cursor position, not selections
  
  const parent = $from.parent;
  const parentOffset = $from.parentOffset;
  
  // Find the text node at cursor position
  let textContent = "";
  let textStart = 0;
  let cursorInText = 0;
  
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const childEnd = textStart + child.nodeSize;
    
    if (child.isText && parentOffset >= textStart && parentOffset <= childEnd) {
      textContent = child.textContent;
      cursorInText = parentOffset - textStart;
      break;
    }
    
    textStart = childEnd;
  }
  
  if (!textContent) return "";
  
  // Find word boundaries around cursor position
  const text = textContent;
  let start = cursorInText;
  let end = cursorInText;
  
  // Move start backwards to find word start
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }
  
  // Move end forwards to find word end
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }
  
  return text.slice(start, end);
}

// Get word from position before cursor (for end-of-word detection)
export function getWordBeforeCursor(state) {
  const { $from } = state.selection;
  const { empty } = state.selection;
  
  if (!empty) return ""; // Only for cursor position
  
  const parentOffset = $from.parentOffset;
  if (parentOffset === 0) return ""; // At start of parent
  
  // Check position before cursor for link
  const $prev = state.doc.resolve($from.pos - 1);
  const linkMark = state.schema.marks.link.isInSet($prev.marks());
  if (linkMark) {
    // Create a temporary state at that position to extract link text
    const tempState = state.apply(state.tr.setSelection(
      state.selection.constructor.create(state.doc, $prev.pos)
    ));
    return getLinkText(tempState);
  }
  
  // Extract word ending just before cursor
  const parent = $from.parent;
  
  // Find the text node containing the cursor
  let textContent = "";
  let textStart = 0;
  
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const childEnd = textStart + child.nodeSize;
    
    if (child.isText && parentOffset >= textStart && parentOffset <= childEnd) {
      textContent = child.textContent;
      break;
    }
    
    textStart = childEnd;
  }
  
  if (!textContent) return "";
  
  // Use parent offset directly as position in text  
  const cursorInText = parentOffset;
  

  
  // If there's a word character at cursor position or just before
  let wordEnd = cursorInText;
  
  // If cursor is on a word character, include it
  if (cursorInText < textContent.length && /\w/.test(textContent[cursorInText])) {
    wordEnd = cursorInText + 1;
  }
  
  // If there's a word character just before cursor position
  if (cursorInText > 0 && /\w/.test(textContent[cursorInText - 1])) {
    let start = cursorInText;
    
    // Move start backwards to find word beginning
    while (start > 0 && /\w/.test(textContent[start - 1])) {
      start--;
    }
    
    return textContent.slice(start, wordEnd);
  }
  
  return "";
}

// Create or update link
export function setLink(href, title = null) {
  return (state, dispatch) => {
    const { link } = state.schema.marks;
    if (!link) return false;
    
    const { from, to, empty } = state.selection;
    const attrs = { href };
    if (title) attrs.title = title;
    
    if (dispatch) {
      if (empty) {
        dispatch(state.tr.addStoredMark(link.create(attrs)));
      } else {
        dispatch(state.tr.addMark(from, to, link.create(attrs)));
      }
    }
    
    return true;
  };
}

// Remove link from selection
export function removeLink() {
  return (state, dispatch) => {
    const { link } = state.schema.marks;
    if (!link) return false;
    
    const { from, to } = state.selection;
    
    if (dispatch) {
      dispatch(state.tr.removeMark(from, to, link));
    }
    
    return true;
  };
}

// Enhanced link command with custom dialog
export function createLinkCommand() {
  return (state, dispatch, view) => {
    const { link } = state.schema.marks;
    if (!link) return false;
    
    const { from, to, empty } = state.selection;
    let linkText = "";
    let linkUrl = "";
    
    // Get current link if editing existing
    let linkNewWindow = false;
    if (hasLink(state)) {
      const attrs = getLinkAttrs(state);
      if (attrs) {
        linkUrl = attrs.href || "";
        linkText = getLinkText(state);
        linkNewWindow = attrs.target === "_blank";
      }
    } 
    // Enhancement 1: If cursor is on unlinked word, populate with that word
    else if (empty) {
      const wordAtCursor = getWordAtCursor(state);
      if (wordAtCursor) {
        linkText = wordAtCursor;
      } else {
        // Enhancement 2: Check if cursor is at end of word/link
        const wordBefore = getWordBeforeCursor(state);
        if (wordBefore) {
          linkText = wordBefore;
        }
      }
    }
    // Get selected text as default link text (for new selections)
    else if (!empty) {
      linkText = state.doc.textBetween(from, to);
    }
    
    // Use custom modal dialog
    import('../ui/dialogs.js').then(({ showLinkDialog }) => {
      showLinkDialog({
        initialUrl: linkUrl,
        initialText: linkText,
        initialNewWindow: linkNewWindow,
        onConfirm: ({ text, url, newWindow }) => {
          if (!dispatch) return;
          
          // Create link attributes
          const linkAttrs = { href: url };
          if (newWindow) {
            linkAttrs.target = "_blank";
            linkAttrs.rel = "noopener noreferrer";
          }
          
          let tr = state.tr;
          
          if (empty) {
            // Check if we detected a word at cursor - if so, replace it
            const wordAtCursor = getWordAtCursor(state);
            const wordBefore = getWordBeforeCursor(state);
            
            if (wordAtCursor && text === wordAtCursor) {
              // Replace the word at cursor with link
              const { $from } = state.selection;
              const parent = $from.parent;
              const parentOffset = $from.parentOffset;
              
              // Find word boundaries in the parent
              let textNode = null;
              let nodeStart = 0;
              let wordStart = 0;
              let wordEnd = 0;
              
              for (let i = 0; i < parent.childCount; i++) {
                const child = parent.child(i);
                const nodeEnd = nodeStart + child.nodeSize;
                
                if (child.isText && parentOffset >= nodeStart && parentOffset <= nodeEnd) {
                  textNode = child;
                  const textContent = child.textContent;
                  const cursorInText = parentOffset - nodeStart;
                  
                  // Find word boundaries
                  wordStart = cursorInText;
                  wordEnd = cursorInText;
                  
                  while (wordStart > 0 && /\w/.test(textContent[wordStart - 1])) {
                    wordStart--;
                  }
                  while (wordEnd < textContent.length && /\w/.test(textContent[wordEnd])) {
                    wordEnd++;
                  }
                  
                  // Convert to document positions
                  wordStart = $from.pos - (parentOffset - nodeStart) + wordStart;
                  wordEnd = $from.pos - (parentOffset - nodeStart) + wordEnd;
                  break;
                }
                
                nodeStart = nodeEnd;
              }
              
              if (textNode && wordStart < wordEnd) {
                // Replace the word with linked text
                tr = tr.delete(wordStart, wordEnd);
                tr = tr.insertText(text, wordStart);
                tr = tr.addMark(wordStart, wordStart + text.length, link.create(linkAttrs));
              }
            } else if (wordBefore && text === wordBefore) {
              // Similar logic for word before cursor
              // For now, just insert new text (fallback)
              const linkNode = state.schema.text(text, [link.create(linkAttrs)]);
              tr = tr.replaceSelectionWith(linkNode, false);
            } else {
              // Insert completely new link
              const linkNode = state.schema.text(text, [link.create(linkAttrs)]);
              tr = tr.replaceSelectionWith(linkNode, false);
            }
          } else {
            // Add link to existing selection
            tr = tr.addMark(from, to, link.create(linkAttrs));
          }
          
          dispatch(tr);
          view.focus();
        },
        onCancel: () => {
          view.focus();
        }
      });
    });
    
    return true;
  };
}
