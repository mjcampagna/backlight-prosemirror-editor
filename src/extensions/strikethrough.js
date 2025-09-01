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
