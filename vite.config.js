import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths
  build: {
    target: 'esnext', // Modern browsers
    outDir: 'dist', // Customize the output directory
    assetsDir: '.', // Put assets in the root of `outDir`
    minify: false, // Disable minification globally
    esbuild: {
      keepNames: true, // Attempts to keep original function and class names
    },
    rollupOptions: {
      output: {
        // Ensures assets are named consistently without hash for easier referencing
        assetFileNames: '[name][extname]',
        chunkFileNames: 'index.js',
        entryFileNames: 'usfm-alignment-remover.js',
      },
    },
  },
});