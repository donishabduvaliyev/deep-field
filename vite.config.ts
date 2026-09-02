import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    // three is the bulk of the bundle; split it so the shell paints first
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], react: ["react", "react-dom"] },
      },
    },
  },
  // If you deploy to GitHub Pages at https://<user>.github.io/<repo>/,
  // uncomment the next line and set it to "/<repo>/".
  // base: "/deep-field/",
});
