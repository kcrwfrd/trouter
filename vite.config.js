import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/Router.js',
      name: 'trouter',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'es' ? 'trouter.js' : 'trouter.umd.js',
    },
    sourcemap: true,
    rollupOptions: {
      external: ['lodash'],
      output: {
        globals: {
          lodash: '_',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
