// Example extension: strikethrough support
import { toggleMark } from "prosemirror-commands";

export const strikethroughExtension = {
  name: "strikethrough",
  marks: {
    strikethrough: {
      parseDOM: [{tag: "s"}, {tag: "del"}, {tag: "strike"}],
      toDOM() { return ["s", 0]; }
    }
  },
  md: {
    configureMarkdownIt(md) {
      // Enable strikethrough plugin if available
      if (md.use && typeof md.use === 'function') {
        try {
          // This would work if markdown-it-strikethrough was installed
          // md.use(require('markdown-it-strikethrough'));
        } catch (e) {
          // Fallback: basic manual parsing
        }
      }
    },
    tokens: {
      s_open: { mark: "strikethrough" },
      s_close: { mark: "strikethrough" }
    },
    toMarkdown: {
      marks: {
        strikethrough: {
          open: "~~",
          close: "~~",
          mixable: true,
          expelEnclosingWhitespace: true
        }
      }
    }
  },
  keymap(schema) {
    return {
      "Mod-Shift-x": (state, dispatch) => {
        const { strikethrough } = schema.marks;
        if (!strikethrough) return false;
        return toggleMark(strikethrough)(state, dispatch);
      }
    };
  }
};
