import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // /fixtures/**.json lives at the repo root, one level above this package.
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
