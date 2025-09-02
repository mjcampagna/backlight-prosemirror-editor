// Minimal modal dialog system

// Create overlay and modal container
function createModal() {
  const overlay = document.createElement('div');
  overlay.className = 'pm-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'pm-modal';
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });
  
  // Store escape handler for later access to onCancel callback
  let escapeHandler = null;
  
  const setupEscapeHandler = (onCancel) => {
    escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal(overlay);
        document.removeEventListener('keydown', escapeHandler);
        if (onCancel) onCancel(); // Call onCancel like Cancel button does
      }
    };
    document.addEventListener('keydown', escapeHandler);
  };
  
  return { overlay, modal, setupEscapeHandler };
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

// Link dialog
export function showLinkDialog(options = {}) {
  const { initialUrl = '', initialText = '', initialNewWindow = false, onConfirm, onCancel } = options;
  
  const { overlay, modal, setupEscapeHandler } = createModal();
  
  modal.innerHTML = `
    <div class="pm-modal-header">
      <h3>Insert Link</h3>
    </div>
    <div class="pm-modal-body">
      <div class="pm-modal-field">
        <label for="pm-link-text">Link Text:</label>
        <input type="text" id="pm-link-text" value="${initialText}" placeholder="Link text">
      </div>
      <div class="pm-modal-field">
        <label for="pm-link-url">URL:</label>
        <input type="url" id="pm-link-url" value="${initialUrl}" placeholder="https://example.com">
      </div>
      <div class="pm-modal-field">
        <label class="pm-modal-checkbox">
          <input type="checkbox" id="pm-link-new-window" ${initialNewWindow ? 'checked' : ''}>
          Open link in new window
        </label>
      </div>
    </div>
    <div class="pm-modal-footer">
      <button type="button" class="pm-modal-btn pm-modal-btn-cancel">Cancel</button>
      <button type="button" class="pm-modal-btn pm-modal-btn-primary">Insert Link</button>
    </div>
  `;
  
  const textInput = modal.querySelector('#pm-link-text');
  const urlInput = modal.querySelector('#pm-link-url');
  const newWindowCheckbox = modal.querySelector('#pm-link-new-window');
  const cancelBtn = modal.querySelector('.pm-modal-btn-cancel');
  const confirmBtn = modal.querySelector('.pm-modal-btn-primary');
  
  // Focus first empty field
  setTimeout(() => {
    if (!initialText) {
      textInput.focus();
    } else if (!initialUrl) {
      urlInput.focus();
    } else {
      urlInput.focus();
    }
  }, 50);
  
  // Handle form submission
  const handleConfirm = () => {
    const text = textInput.value.trim();
    const url = urlInput.value.trim();
    const newWindow = newWindowCheckbox.checked;
    
    if (!url) {
      urlInput.focus();
      return;
    }
    
    closeModal(overlay);
    if (onConfirm) {
      onConfirm({ text, url, newWindow });
    }
  };
  
  const handleCancel = () => {
    closeModal(overlay);
    if (onCancel) {
      onCancel();
    }
  };
  
  // Event listeners
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  
  // Setup escape handler to call onCancel (same as Cancel button)
  setupEscapeHandler(() => {
    if (onCancel) onCancel(); // Just call onCancel, closeModal already called by escape handler
  });
  
  // Enter to confirm, Escape handled by modal
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  });
  
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      urlInput.focus();
    }
  });
  
  return { overlay, modal, close: () => closeModal(overlay) };
}
