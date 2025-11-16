// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  // Site URL for sitemap generation - should be set via environment variable in production
  site: import.meta.env.PUBLIC_SITE_URL || "https://training-planner.pages.dev",
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare({
    mode: "directory",
    routes: {
      strategy: "auto",
    },
    // Optimize images at build time since sharp is not supported at runtime
    imageService: "compile",
  }),
});
