// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: node({
    mode: "standalone",
  }),
  // Environment variables schema with type safety and validation
  env: {
    schema: {
      // Public client variables (available in browser)
      PUBLIC_SITE_URL: envField.string({
        context: "client",
        access: "public",
        default: "http://localhost:3000",
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
