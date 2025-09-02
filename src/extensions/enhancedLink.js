// Enhanced link extension with target="_blank" support and HTML serialization

export const enhancedLinkExtension = {
  name: "enhancedLink",
  marks: {
    link: {
      attrs: {
        href: {},
        title: { default: null },
        target: { default: null },
        rel: { default: null }
      },
      inclusive: false,
      parseDOM: [{
        tag: "a[href]",
        getAttrs(dom) {
          return {
            href: dom.getAttribute("href"),
            title: dom.getAttribute("title"),
            target: dom.getAttribute("target"),
            rel: dom.getAttribute("rel")
          };
        }
      }],
      toDOM(mark) {
        const { href, title, target, rel } = mark.attrs;
        const attrs = { href };
        
        if (title) attrs.title = title;
        if (target) {
          attrs.target = target;
          // Add security attributes for target="_blank"
          if (target === "_blank") {
            attrs.rel = rel || "noopener noreferrer";
          } else if (rel) {
            attrs.rel = rel;
          }
        }
        
        return ["a", attrs, 0];
      }
    }
  },
  md: {
    toMarkdown: {
      marks: {
        link: {
          // Custom serializer for links with target="_blank"
          open(state, mark, parent, index) {
            const { href, title, target, rel } = mark.attrs;
            
            // If target="_blank", serialize as HTML to preserve attributes
            if (target === "_blank") {
              const titleAttr = title ? ` title="${title}"` : '';
              const relAttr = rel || "noopener noreferrer";
              return `<a href="${href}" rel="${relAttr}" target="_blank"${titleAttr}>`;
            }
            
            // Regular markdown link
            return "[";
          },
          close(state, mark, parent, index) {
            const { href, title, target } = mark.attrs;
            
            // If target="_blank", close HTML tag
            if (target === "_blank") {
              return "</a>";
            }
            
            // Regular markdown link
            const titlePart = title ? ` "${title}"` : '';
            return `](${href}${titlePart})`;
          },
          mixable: true,
          expelEnclosingWhitespace: true
        }
      }
    }
  }
};
