import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    // Optimize HMR for better memory usage
    hmr: {
      overlay: false
    }
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'react-hook-form'],
    // Exclude rarely changed dependencies from optimization
    exclude: []
  },
  build: {
    // Reduce memory usage during build
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Enhanced code splitting for better performance
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          radixUI: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          utils: ['axios', 'date-fns', 'clsx', 'tailwind-merge']
        }
      }
    }
  },
  // Prevent memory leaks in development
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})

