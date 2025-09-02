import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    minify: true,
    lib: {
      entry: "src/index.js",
      name: "PMBundle",
      fileName: (format) => 
        format === "es" ? "prosemirror-bundle.esm.js" : "prosemirror-bundle.iife.js",
      formats: ["es", "iife"]
    },
    rollupOptions: {
      external: []
    },

    emptyOutDir: true
  },
  define: {
    // Some libs check NODE_ENV — this keeps production code paths in build
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development"
    )
  }
});
