import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { OutputAsset } from 'rollup';

/**
 * Inline the entry-point CSS into index.html as a <style> block.
 * Removes the external `assets/index-*.css` file from the bundle so the
 * browser gets all critical styles in the initial HTML response — no extra
 * round-trip, no render-blocking request, and no JS-dependency chain entry.
 */
function inlineCriticalCss(): Plugin {
  return {
    name: 'inline-critical-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const htmlChunk = bundle['index.html'] as OutputAsset | undefined;
      if (!htmlChunk) return;

      const cssKey = Object.keys(bundle).find(
        k => /^assets\/index-[^/]+\.css$/.test(k),
      );
      if (!cssKey) return;

      const css = (bundle[cssKey] as OutputAsset).source as string;
      // Replace the external <link rel="stylesheet"> with an inline <style>
      htmlChunk.source = (htmlChunk.source as string).replace(
        /<link rel="stylesheet"[^>]*>/,
        `<style>${css}</style>`,
      );
      delete bundle[cssKey];
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCriticalCss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-i18n':  ['i18next', 'react-i18next'],
        },
      },
    },
  },
  base: '/the-everything-hub/'
});
