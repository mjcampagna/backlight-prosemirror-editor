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
      name: "PMBundle",
      fileName: () => "prosemirror-bundle.esm.js",
      formats: ["es"]
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
