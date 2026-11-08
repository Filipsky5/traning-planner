# Dependency upgrade — 2026-11-08

## Scope and versions

The user authorized major-version upgrades and the required code migrations.
Versions below compare the original installed lockfile with the updated lockfile.

| Package                   | Before  | After   |
| ------------------------- | ------- | ------- |
| Node                      | 22.14.0 | 22.23.4 |
| Astro                     | 5.16.8  | 7.4.7   |
| Node adapter              | 9.5.1   | 11.1.11 |
| React integration         | 4.4.2   | 7.1.4   |
| Cloudflare adapter        | 12.6.12 | 14.4.6  |
| React / React DOM         | 19.2.3  | 19.3.1  |
| Supabase SSR              | 0.7.0   | 0.12.7  |
| Supabase JS               | 2.90.1  | 2.119.0 |
| Zod                       | 3.25.76 | 4.6.7   |
| React Hook Form resolvers | 5.2.2   | 7.0.3   |
| DayPicker                 | 9.13.0  | 10.0.2  |
| Tailwind CSS              | 4.1.18  | 4.3.5   |
| Vitest / UI / V8 coverage | 4.0.16  | 5.1.0   |
| Playwright                | 1.57.0  | 1.65.0  |
| jsdom                     | 27.4.0  | 31.0.0  |
| TypeScript                | 5.8.3   | 5.9.3   |

Other direct dependencies were refreshed to compatible current releases. Vite 8
and Prettier are now explicit development dependencies. The unused `happy-dom`
dependency and the obsolete React Compiler beta lint plugin were removed. React
Compiler diagnostics now come from the current React Hooks ESLint plugin.

## Compatibility decisions

- Node remains on the project's existing major version, with an updated patch
  pin and minimum engine requirement of 22.23.4.
- ESLint remains at 9.39.5 because the current React, accessibility, and import
  lint plugins declare peers for ESLint 9, not 10. ESLint 9 is deprecated upstream;
  moving to 10 requires compatible replacements or upstream plugin releases.
  Astro's lint plugin stays on its compatible 1.7 release for the same reason.
- TypeScript stays on 5.9 because `typescript-eslint` 8.72.1 supports TypeScript
  versions below 6.1; the latest TypeScript major is outside that peer range.
- A scoped override makes `@typescript-eslint/typescript-estree` use
  `minimatch ^11.0.1`. Its declared 10.x range still includes
  [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
  Lint validates the updated parser path. Remove the override when the upstream
  parser adopts a patched range.
- New React Hooks performance guidance about state updates in effects is kept
  as warnings for existing SSR hydration and imperative fetch flows. Other
  recommended rules remain enabled. Lint reports eight warnings and no errors.
- The accessibility autofocus rule continues applying to DOM elements; custom
  Calendar components may pass DayPicker's `autoFocus` option for popover focus.

## Required code changes

- Zod's removed `required_error` / `invalid_type_error` options use the v4 `error`
  API while retaining existing required-field messages.
- API error handlers use `ZodError.issues` instead of the removed `.errors` alias.
- Context/payload records declare their string key schema explicitly.
- The completion form distinguishes Zod input values from parsed output values
  in React Hook Form's resolver types.
- DayPicker uses `autoFocus` and `month_grid` instead of removed v9 aliases.
- Testing Library uses its Vitest matcher entrypoint; Vite config uses
  `import.meta.dirname`.
- Database declarations now reflect the already-tracked migrations for
  `ai_suggestions.planned_date` and nullable `ai_logs.user_id`. No database
  migration was applied to a live database.
- Formatting follows the updated Prettier and Astro formatter.

## Cloudflare hosting

The current Cloudflare adapter no longer supports Pages. Configuration and the
manual GitHub deployment workflow now target **Workers**. The workflow preserves
the generated Wrangler deployment redirect and explicitly uploads Worker secrets.
Existing Pages projects need account-side domain and auth redirect migration;
these repository changes do not deploy or switch traffic.

See [the Cloudflare deployment guide](cloudflare-deployment-guide.md).

## Validation

- A clean `npm ci` succeeds.
- `npm audit` reports zero vulnerabilities, down from 42 affected dependency
  entries (4 critical, 29 high, 7 moderate, 2 low). Audit counts include transitive
  and development tooling and do not establish application exploitability.
- 249 unit tests pass (2 existing tests remain skipped), and the configured
  coverage thresholds pass. Added regression
  coverage exercises authentication validation, AI suggestion payloads and
  pagination, and actual DayPicker selection/focus behavior.
- Node and Cloudflare production builds succeed.
- `wrangler deploy --dry-run` successfully packages the Worker without publishing.
- Seven public-page browser smoke tests pass against the production Node build
  using local Chrome. They exercise hydration, auth redirects, local form
  validation, and the server validation response contract.

Run the isolated public-page suite after a Node build:

```sh
npm run build
npm run test:smoke
```

Install the matching Playwright Chromium browser first with
`npx playwright install chromium`, or use an installed Chrome with
`PLAYWRIGHT_CHANNEL=chrome npm run test:smoke`. The smoke suite is also included
in the pull-request workflow. It uses no authenticated test account and has no
data cleanup hooks. The existing authenticated onboarding/calendar E2E suite was
not run because it creates and deletes data in its configured Supabase account.

## Existing type-check backlog

`tsc --noEmit` is not clean. The original checkout was independently installed in
a temporary directory and produced 61 diagnostics. After the migration-specific
fixes and database declaration alignment, 40 existing diagnostics remain, mainly
stale test fixtures, incorrect imports in `useCalendar`, JSON payload typing,
nullable goal state, Playwright type-only imports, and mismatched AI logging
helper calls. Builds transpile without enforcing these types. A dedicated
type-check cleanup remains necessary before making it a CI requirement.

## Primary migration references

- [Astro 6 migration](https://docs.astro.build/en/guides/upgrade-to/v6/)
- [Astro 7 migration](https://docs.astro.build/en/guides/upgrade-to/v7/)
- [Zod 4 migration](https://zod.dev/v4/changelog)
- [DayPicker 10 migration](https://daypicker.dev/upgrading)
