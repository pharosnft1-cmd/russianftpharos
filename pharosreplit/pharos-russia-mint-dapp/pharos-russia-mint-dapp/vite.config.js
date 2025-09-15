
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'crypto', 'http', 'https', 'url', 'assert'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    })
  ],
  // server: {
  //   host: '0.0.0.0',
  //   port: 5000,
  //   allowedHosts: true,
  //   hmr: false  // Отключаем HMR для стабильности WalletConnect
  // },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.version': JSON.stringify('v18.0.0'),
    'process.browser': true
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {
          buffer: 'Buffer'
        }
      }
    }
  }
})
