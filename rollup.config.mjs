import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.js",
  treeshake: true,
  plugins: [
    // Small env shim to help some deps pick production code paths if any
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    terser()
  ],
  // We bundle everything — no externals — so your single file works anywhere.
  output: [
    {
      file: "dist/prosemirror-bundle.iife.js",
      format: "iife",
      name: "PMBundle",   // window.PMBundle.{exports}
      sourcemap: true
    },
    {
      file: "dist/prosemirror-bundle.esm.js",
      format: "es",
      sourcemap: true
    }
  ]
};
