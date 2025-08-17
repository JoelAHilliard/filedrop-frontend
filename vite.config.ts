import path from "path"
import preact from "@preact/preset-vite"
import { defineConfig } from "vite"

export default defineConfig(({ command, mode }) => ({
  plugins: [preact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __WS_TOKEN__: JSON.stringify(process.env.WS_TOKEN || ''),
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    hmr: command === 'serve' ? {
      clientPort: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT) : undefined,
    } : false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}))
