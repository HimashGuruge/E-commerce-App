import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3001,
    // Proxy upload requests to backend for old URLs stored in MongoDB
    proxy: {
      '/public/uploads': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace('/public', ''),
      },
    },
    // headers to prevent Google Login popup blocking
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});