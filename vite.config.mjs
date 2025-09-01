import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "src/index.js",
        styles: "src/styles/baseline.css"
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main') {
            return 'prosemirror-bundle.esm.js'
          }
          return '[name]-[hash].js'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'prosemirror-bundle.css'
          }
          return '[name]-[hash].[ext]'
        }
      },
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
