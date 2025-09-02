// Link commands and utilities

// Check if selection has link mark
export function hasLink(state) {
  const { link } = state.schema.marks;
  if (!link) return false;
  
  const { from, to, empty } = state.selection;
  if (empty) {
    const storedMarks = state.storedMarks || state.selection.$from.marks();
    return link.isInSet(storedMarks);
  }
  
  return state.doc.rangeHasMark(from, to, link);
}

// Get link attributes from current selection
export function getLinkAttrs(state) {
  const { link } = state.schema.marks;
  if (!link || !hasLink(state)) return null;
  
  const { from, $from } = state.selection;
  const mark = link.isInSet($from.marks()) || 
               state.doc.rangeHasMark(from, from + 1, link) && 
               link.isInSet(state.doc.resolve(from).marks());
  
  return mark ? mark.attrs : null;
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
        // For empty selection, just add to stored marks
        dispatch(state.tr.addStoredMark(link.create(attrs)));
      } else {
        // For selection, add link mark
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

// Toggle link (if has link, remove it; if no link, prompt for URL)
export function toggleLink() {
  return (state, dispatch, view) => {
    const { link } = state.schema.marks;
    if (!link) return false;
    
    if (hasLink(state)) {
      // Remove existing link
      return removeLink()(state, dispatch, view);
    } else {
      // Prompt for URL and create link
      const href = prompt("Enter URL:");
      if (href) {
        return setLink(href)(state, dispatch, view);
      }
    }
    
    return false;
  };
}

// Enhanced link command with dialog
export function createLinkCommand() {
  return (state, dispatch, view) => {
    const { link } = state.schema.marks;
    if (!link) return false;
    
    const { from, to, empty } = state.selection;
    let linkText = "";
    let linkUrl = "";
    
    // Get current link if editing existing
    if (hasLink(state)) {
      const attrs = getLinkAttrs(state);
      if (attrs) {
        linkUrl = attrs.href || "";
      }
    }
    
    // Get selected text as default link text
    if (!empty) {
      linkText = state.doc.textBetween(from, to);
    }
    
    // Simple prompt-based dialog for now
    const url = prompt("Enter URL:", linkUrl);
    if (!url) return false;
    
    const text = empty ? prompt("Enter link text:", linkText || url) : linkText;
    if (!text && empty) return false;
    
    if (dispatch) {
      let tr = state.tr;
      
      if (empty) {
        // Insert new link
        const linkNode = state.schema.text(text, [link.create({ href: url })]);
        tr = tr.replaceSelectionWith(linkNode, false);
      } else {
        // Add link to selection
        tr = tr.addMark(from, to, link.create({ href: url }));
      }
      
      dispatch(tr);
    }
    
    return true;
  };
}
