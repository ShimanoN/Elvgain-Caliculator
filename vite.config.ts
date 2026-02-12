import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Elvgain-Caliculator/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'week-target': resolve(__dirname, 'week-target.html'),
      },
    },
  },
  server: {
    port: 8000,
    open: false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '~': resolve(__dirname, './'),
      // Map .js imports to .ts files
      '/js/constants.js': resolve(__dirname, 'js/constants.ts'),
      '/js/formatters.js': resolve(__dirname, 'js/formatters.ts'),
      '/js/iso-week.js': resolve(__dirname, 'js/iso-week.ts'),
      '/js/date-utils.js': resolve(__dirname, 'js/date-utils.ts'),
      '/js/db.js': resolve(__dirname, 'js/db.ts'),
      '/js/backup.js': resolve(__dirname, 'js/backup.ts'),
      '/js/sample-data.js': resolve(__dirname, 'js/sample-data.ts'),
      '/js/calculations.js': resolve(__dirname, 'js/calculations.ts'),
      '/js/chart.js': resolve(__dirname, 'js/chart.ts'),
      '/js/export-image.js': resolve(__dirname, 'js/export-image.ts'),
    },
  },
  esbuild: {
    // Enable JSX/TSX transformation if needed
    loader: 'ts',
  },
}));
