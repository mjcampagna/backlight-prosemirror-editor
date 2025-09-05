// HTML security utilities for preventing XSS

/**
 * Escape HTML to prevent XSS in user content
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if HTML content appears safe for display
 * This is a basic check - for production use, consider DOMPurify
 */
export function isSafeHtml(html) {
  // Basic checks for obviously dangerous patterns
  const dangerousPatterns = [
    /<script\b/i,
    /<iframe\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onload, etc.
    /<object\b/i,
    /<embed\b/i,
    /<form\b/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(html));
}

/**
 * Emit a security warning event for the host application
 */
export function emitSecurityWarning(element, issue, details) {
  const event = new CustomEvent('pm-security-warning', {
    detail: { element, issue, details },
    bubbles: true
  });
  element.dispatchEvent(event);
  console.warn(`[ProseMirror Security] ${issue}:`, details);
}

/**
 * Basic HTML sanitizer - strips dangerous attributes and elements
 * For production, replace with DOMPurify
 */
export function basicSanitize(html) {
  if (!isSafeHtml(html)) {
    return escapeHtml(html); // Escape everything if dangerous patterns detected
  }
  
  // Basic cleanup - remove event handlers
  return html.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Enhanced error logging for security issues
 */
export function logSecurityIssue(component, action, details, element = null) {
  const logData = {
    timestamp: new Date().toISOString(),
    component,
    action,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error(`[ProseMirror Security] ${component}:${action}`, logData);
  
  // Emit event for host application monitoring
  if (element) {
    emitSecurityWarning(element, `${component}:${action}`, details);
  }
}
