// Link commands and utilities

// Check if selection has link mark
export function hasLink(state) {
  const { link } = state.schema.marks;
  if (!link) return false;
  
  const { from, to, empty } = state.selection;
  if (empty) {
    const storedMarks = state.storedMarks || state.selection.$from.marks();
    return Boolean(link.isInSet(storedMarks));
  }
  
  return Boolean(state.doc.rangeHasMark(from, to, link));
}

// Get link attributes from current selection
export function getLinkAttrs(state) {
  const { link } = state.schema.marks;
  if (!link) return null;
  
  const { from, $from } = state.selection;
  const mark = link.isInSet($from.marks());
  return mark ? mark.attrs : null;
}

// Extract full link text by finding the containing text node
export function getLinkText(state) {
  const { link } = state.schema.marks;
  if (!link || !hasLink(state)) return "";
  
  const { $from } = state.selection;
  
  // Get the link mark from current position
  const linkMark = link.isInSet($from.marks());
  if (!linkMark) return "";
  
  // Find the text node that contains this position and has the link mark
  const parentOffset = $from.parentOffset;
  const parent = $from.parent;
  
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
    if (hasLink(state)) {
      const attrs = getLinkAttrs(state);
      if (attrs) {
        linkUrl = attrs.href || "";
        linkText = getLinkText(state); // Use the improved function
      }
    }
    
    // Get selected text as default link text (for new links)
    if (!linkText && !empty) {
      linkText = state.doc.textBetween(from, to);
    }
    
    // Use custom modal dialog
    import('../ui/dialogs.js').then(({ showLinkDialog }) => {
      showLinkDialog({
        initialUrl: linkUrl,
        initialText: linkText,
        onConfirm: ({ text, url }) => {
          if (!dispatch) return;
          
          let tr = state.tr;
          
          if (empty) {
            // Insert new link
            const linkNode = state.schema.text(text || url, [link.create({ href: url })]);
            tr = tr.replaceSelectionWith(linkNode, false);
          } else {
            // Add link to selection
            tr = tr.addMark(from, to, link.create({ href: url }));
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
