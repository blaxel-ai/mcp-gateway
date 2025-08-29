import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    outDir: 'dist',
    sourcemap: true,
    dts: true,
    minify: true,
    splitting: true,
  },
  {
    entry: ['src/index.ts'],
    format: 'esm',
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    splitting: false,
    outExtension: () => ({ js: '.mjs' }),
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);