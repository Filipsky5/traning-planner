import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

const baseConfig = tseslint.config({
  extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
  rules: {
    "no-console": "warn",
    "no-unused-vars": "off",
  },
});

const jsxA11yConfig = tseslint.config({
  files: ["**/*.{js,jsx,ts,tsx}"],
  extends: [jsxA11y.flatConfigs.recommended],
  languageOptions: {
    ...jsxA11y.flatConfigs.recommended.languageOptions,
  },
  rules: {
    ...jsxA11y.flatConfigs.recommended.rules,
  },
});

const reactConfig = tseslint.config({
  files: ["**/*.{js,jsx,ts,tsx}"],
  extends: [pluginReact.configs.flat.recommended],
  languageOptions: {
    ...pluginReact.configs.flat.recommended.languageOptions,
    globals: {
      window: true,
      document: true,
    },
  },
  plugins: {
    "react-hooks": eslintPluginReactHooks,
    "react-compiler": reactCompiler,
  },
  settings: { react: { version: "detect" } },
  rules: {
    ...eslintPluginReactHooks.configs.recommended.rules,
    "react/react-in-jsx-scope": "off",
    "react-compiler/react-compiler": "error",
  },
});

// Allow console.log in specific contexts where logging is appropriate
const consoleOverrides = tseslint.config({
  files: [
    "src/pages/api/**/*.{js,ts}", // API routes (server-side logging)
    "e2e/**/*.{js,ts}", // E2E tests (test debugging)
    "src/lib/errors/**/*.{js,ts}", // Error handlers (error logging)
    "src/lib/services/**/*.{js,ts}", // Services (service logging)
    "src/lib/hooks/**/*.{js,ts}", // Hooks (debugging - lib)
    "src/components/hooks/**/*.{js,ts}", // Hooks (debugging - components)
    "src/components/**/*.{jsx,tsx}", // Components (temporary - TODO: replace with proper logging)
  ],
  rules: {
    "no-console": "off",
  },
});

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  baseConfig,
  jsxA11yConfig,
  reactConfig,
  consoleOverrides, // Apply console overrides
  eslintPluginAstro.configs["flat/recommended"],
  eslintPluginPrettier
);
