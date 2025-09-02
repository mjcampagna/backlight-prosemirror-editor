import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { createMarkdownSystem } from '../../markdownSystem.js'
import { hasLink, getLinkAttrs, getLinkText, getWordAtCursor, getWordBeforeCursor } from '../links.js'

describe('Link Commands', () => {
  let system, schema

  beforeEach(() => {
    system = createMarkdownSystem([])
    schema = system.schema
  })

  describe('Link Text Extraction', () => {
    it('should extract full link text when cursor is at beginning', () => {
      // Create a document with a link: "Visit [Google](https://google.com) now"
      const doc = system.mdParser.parse('Visit [Google](https://google.com) now')
      
      // Find the position INSIDE the "Google" text (not at the boundary)
      let linkStart = -1;
      doc.descendants((node, pos) => {
        if (node.isText && node.marks.some(mark => mark.type === schema.marks.link)) {
          linkStart = pos + 1; // +1 to get inside the text node, not at boundary
          return false;
        }
      });
      
      expect(linkStart).toBeGreaterThan(-1); // Should find the link
      
      // Create state with cursor at start of link text
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, linkStart)
      });
      
      console.log('DEBUG beginning test:');
      console.log('  linkStart position:', linkStart);
      console.log('  cursor marks:', state.selection.$from.marks().map(m => m.type.name));
      console.log('  hasLink result:', hasLink(state));
      
      expect(hasLink(state)).toBe(true);
      
      // Test our getLinkAttrs function
      const attrs = getLinkAttrs(state);
      expect(attrs).toBeDefined();
      expect(attrs.href).toBe('https://google.com');
    })

    it('should extract full link text when cursor is in middle', () => {
      const doc = system.mdParser.parse('Check [GitHub](https://github.com) out')
      
      // Find position in middle of "GitHub" 
      let linkMiddle = -1;
      doc.descendants((node, pos) => {
        if (node.isText && node.textContent.includes('GitHub') && 
            node.marks.some(mark => mark.type === schema.marks.link)) {
          linkMiddle = pos + 3; // Middle of "GitHub"
          return false;
        }
      });
      
      expect(linkMiddle).toBeGreaterThan(-1);
      
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, linkMiddle)
      });
      
      expect(hasLink(state)).toBe(true);
      const attrs = getLinkAttrs(state);
      expect(attrs.href).toBe('https://github.com');
    })

    it('should extract full link text when cursor is at end', () => {
      const doc = system.mdParser.parse('See [Example](https://example.com) here')
      
      // Find position at end of "Example"
      let linkEnd = -1;
      doc.descendants((node, pos) => {
        if (node.isText && node.textContent.includes('Example') && 
            node.marks.some(mark => mark.type === schema.marks.link)) {
          linkEnd = pos + node.textContent.length - 1; // End of "Example"
          return false;
        }
      });
      
      expect(linkEnd).toBeGreaterThan(-1);
      
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, linkEnd)
      });
      
      expect(hasLink(state)).toBe(true);
      const attrs = getLinkAttrs(state);
      expect(attrs.href).toBe('https://example.com');
    })

    it('should handle multi-word link text', () => {
      const doc = system.mdParser.parse('Visit [Stack Overflow](https://stackoverflow.com) for help')
      
      // Find position in "Stack Overflow"
      let linkPos = -1;
      doc.descendants((node, pos) => {
        if (node.isText && node.textContent.includes('Stack Overflow') && 
            node.marks.some(mark => mark.type === schema.marks.link)) {
          linkPos = pos + 6; // Middle of "Stack Overflow"
          return false;
        }
      });
      
      expect(linkPos).toBeGreaterThan(-1);
      
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, linkPos)
      });
      
      expect(hasLink(state)).toBe(true);
      // The full text "Stack Overflow" should be extractable
    })
  })

  describe('Boundary Detection Debug', () => {
    it('should show what happens with Google link text extraction', () => {
      const markdown = 'Visit [Google](https://google.com) now';
      const doc = system.mdParser.parse(markdown);
      
      console.log('Document structure:');
      doc.descendants((node, pos) => {
        console.log(`  Pos ${pos}: "${node.textContent}" (${node.type.name})`);
        if (node.marks) {
          node.marks.forEach(mark => {
            console.log(`    Mark: ${mark.type.name}`, mark.attrs);
          });
        }
      });
      
      // This test is for debugging - let's see the actual structure
      expect(doc).toBeDefined();
    })
    
    it('should extract complete link text without truncation', () => {
      // Create a simple test case for manual verification
      const linkText = "Google";
      const linkUrl = "https://google.com";
      
      // Create paragraph with link manually
      const linkMark = schema.marks.link.create({ href: linkUrl });
      const textNode = schema.text(linkText, [linkMark]);
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit "),
        textNode,
        schema.text(" now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Find position in middle of "Google" (should be around position 7-8)
      const googleStart = 6; // After "Visit "
      const googleMiddle = googleStart + 3; // Middle of "Google"
      
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, googleMiddle)
      });
      
      console.log('Manual test - cursor at pos', googleMiddle);
      console.log('hasLink:', hasLink(state));
      console.log('getLinkAttrs:', getLinkAttrs(state));
      console.log('getLinkText:', getLinkText(state));
      
      expect(hasLink(state)).toBe(true);
      expect(getLinkText(state)).toBe("Google"); // This should extract full text
    })
  })

  describe('Link Button Highlighting', () => {
    it('should highlight button when cursor is immediately before link', () => {
      // Create paragraph with link: "Visit [Google](url) now"
      const linkMark = schema.marks.link.create({ href: 'https://google.com' });
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit "),
        schema.text("Google", [linkMark]),
        schema.text(" now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Cursor immediately before "G" in "Google" (position 6, right after "Visit ")
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 6) // Right before "Google"
      });
      
      // Debug this specific case
      console.log('Before link test:');
      console.log('  cursor at position:', state.selection.from);
      console.log('  checking position', state.selection.from, '- marks:', state.doc.resolve(state.selection.from).marks().map(m => m.type.name));
      console.log('  checking position', state.selection.from + 1, '- marks:', state.doc.resolve(state.selection.from + 1).marks().map(m => m.type.name));
      console.log('  checking position', state.selection.from + 2, '- marks:', state.doc.resolve(state.selection.from + 2).marks().map(m => m.type.name));
      
      // Button should highlight because cursor is adjacent to link
      expect(hasLink(state)).toBe(true);
    })

    it('should highlight button when cursor is immediately after link', () => {
      // Create paragraph with link: "Visit [Google](url) now"
      const linkMark = schema.marks.link.create({ href: 'https://google.com' });
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit "),
        schema.text("Google", [linkMark]),
        schema.text(" now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Cursor immediately after "e" in "Google" (position 12, right after link)
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 12) // Right after "Google"
      });
      
      // Button should highlight because cursor is adjacent to link
      expect(hasLink(state)).toBe(true);
    })
  })

  describe('Smart Word Detection', () => {
    it('should extract word at cursor position', () => {
      // Create paragraph: "Visit Google now"
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit Google now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Cursor in middle of "Google" 
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 8) // Middle of "Google"
      });
      
      const word = getWordAtCursor(state);
      expect(word).toBe("Google");
    })

    it('should extract word before cursor when at end', () => {
      // Create paragraph: "Visit Google now"
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit Google now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Cursor at end of "Google" (after 'e')
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 12) // After "Google"
      });
      
      const word = getWordBeforeCursor(state);
      expect(word).toBe("Google");
    })

    it('should extract link text when cursor is after existing link', () => {
      // Create paragraph with link: "Visit [Google](url) now"
      const linkMark = schema.marks.link.create({ href: 'https://google.com' });
      const paragraph = schema.nodes.paragraph.create(null, [
        schema.text("Visit "),
        schema.text("Google", [linkMark]),
        schema.text(" now")
      ]);
      const doc = schema.nodes.doc.create(null, [paragraph]);
      
      // Cursor right after "Google" link
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 12) // After link
      });
      
      const word = getWordBeforeCursor(state);
      expect(word).toBe("Google");
    })
  })
})
