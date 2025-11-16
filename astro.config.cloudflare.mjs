// @ts-check
import { defineConfig, envField } from "astro/config";

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
  // Environment variables schema with type safety and validation
  env: {
    schema: {
      // Public client variables (available in browser)
      PUBLIC_SITE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://training-planner.pages.dev",
      }),

      // Public server variables (server-only, not secret)
      OPENROUTER_DEFAULT_MODEL: envField.string({
        context: "server",
        access: "public",
        default: "openai/gpt-4o-mini",
      }),
      OPENROUTER_TIMEOUT_MS: envField.number({
        context: "server",
        access: "public",
        default: 30000,
      }),
      OPENROUTER_MAX_RETRIES: envField.number({
        context: "server",
        access: "public",
        default: 3,
      }),

      // Secret server variables (server-only, validated at runtime)
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      INTERNAL_ADMIN_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
    },
    // Validate secrets at startup (recommended for production)
    validateSecrets: true,
  },
});
