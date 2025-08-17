import path from "path"
import preact from "@preact/preset-vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __WS_TOKEN__: JSON.stringify(process.env.WS_TOKEN || ''),
  },
  server: {
    hmr: {
      clientPort: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT) : undefined,
    },
  },
})
