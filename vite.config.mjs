import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    sourcemap: true,
    lib: {
      entry: "src/index.js",
      name: "PMBundle",                    // global for IIFE
      fileName: (format) =>
        format === "es" ? "prosemirror-bundle.esm.js"
          : "prosemirror-bundle.iife.js",
      formats: ["es", "iife"]
    },
    rollupOptions: {
      // We want a single file per format
      output: {
        inlineDynamicImports: true
      },
      // Bundle all deps so the output is drop-in
      external: [],    // keep empty => bundle everything
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
