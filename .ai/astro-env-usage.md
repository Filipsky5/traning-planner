# Astro:env - Type-Safe Environment Variables

## ✅ What Has Been Configured

An `env.schema` with three variable types was added to `astro.config.mjs` and `astro.config.cloudflare.mjs`:

### 1. **Public Client Variables** (available in the browser)

```typescript
PUBLIC_SITE_URL: string;
```

### 2. **Public Server Variables** (server-side only, non-secret)

```typescript
OPENROUTER_DEFAULT_MODEL: string;
OPENROUTER_TIMEOUT_MS: number;
OPENROUTER_MAX_RETRIES: number;
```

### 3. **Secret Server Variables** (server-side only, secret)

```typescript
SUPABASE_URL: string;
SUPABASE_KEY: string;
SUPABASE_SERVICE_ROLE_KEY: string;
OPENROUTER_API_KEY: string;
INTERNAL_ADMIN_TOKEN: string;
```

---

## 📖 How to Use in Code

### **Server-side (API routes, middleware, Astro components)**

```typescript
// src/pages/api/v1/example.ts
import { SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY } from "astro:env/server";
import { OPENROUTER_DEFAULT_MODEL, OPENROUTER_TIMEOUT_MS } from "astro:env/server";

export async function GET() {
  // Use variables with full type safety
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_DEFAULT_MODEL, // TypeScript knows this is a string
    }),
  });

  return new Response(JSON.stringify({ success: true }));
}
```

### **Client-side (React components, client scripts)**

```typescript
// src/components/Example.tsx
import { PUBLIC_SITE_URL } from "astro:env/client";

export function Example() {
  // Only PUBLIC_SITE_URL is available in the browser
  return (
    <div>
      <p>Site URL: {PUBLIC_SITE_URL}</p>
      {/* ❌ NOT ALLOWED: import { SUPABASE_KEY } from "astro:env/client" */}
      {/* This causes a compile error - secret variables are unavailable on the client */}
    </div>
  );
}
```

### **Astro Components**

```astro
---
// src/pages/index.astro
import { PUBLIC_SITE_URL } from "astro:env/client";
import { SUPABASE_URL } from "astro:env/server";

// Astro component frontmatter has access to BOTH
const canonicalUrl = `${PUBLIC_SITE_URL}/`;
const supabaseUrl = SUPABASE_URL; // Server-side only
---

<html>
  <head>
    <link rel="canonical" href={canonicalUrl} />
  </head>
  <body>
    <h1>Welcome</h1>
    <!-- Templates can only use variables defined in frontmatter -->
  </body>
</html>

<script>
  // <script> has access only to client variables
  import { PUBLIC_SITE_URL } from "astro:env/client";
  console.log("Site:", PUBLIC_SITE_URL);
</script>
```

---

## 🔒 Security

### ✅ Safe (Server-only)

```typescript
import { OPENROUTER_API_KEY } from "astro:env/server";
// ✅ OK - used only in an API route
```

### ❌ Unsafe (Attempted Client Use)

```typescript
// src/components/BadExample.tsx
import { OPENROUTER_API_KEY } from "astro:env/client";
// ❌ COMPILE ERROR - secret variables are unavailable on the client
```

---

## 🎯 Type Safety

TypeScript automatically generates types:

```typescript
import { OPENROUTER_TIMEOUT_MS } from "astro:env/server";

// TypeScript KNOWS this is a number
const timeout: number = OPENROUTER_TIMEOUT_MS; // ✅ OK

const timeout2: string = OPENROUTER_TIMEOUT_MS;
// ❌ ERROR: Type 'number' is not assignable to type 'string'
```

---

## 🔄 Migration from `import.meta.env`

### Before (Old Approach):

```typescript
const supabaseUrl = import.meta.env.SUPABASE_URL; // type: string | undefined
const timeout = import.meta.env.OPENROUTER_TIMEOUT_MS; // type: string | undefined

// Must parse and validate manually
const timeoutNumber = parseInt(timeout ?? "30000");
```

### After (New Approach with astro:env):

```typescript
import { SUPABASE_URL, OPENROUTER_TIMEOUT_MS } from "astro:env/server";

// Already correctly typed and validated!
const supabaseUrl = SUPABASE_URL; // type: string
const timeout = OPENROUTER_TIMEOUT_MS; // type: number (no parsing needed!)
```

---

## ⚙️ Validation

### Startup Validation (Enabled in Config)

```javascript
env: {
  schema: { /* ... */ },
  validateSecrets: true, // ← Startup validation
}
```

**Benefits:**

- The application WILL NOT start if required variables are missing
- Errors appear IMMEDIATELY, rather than when someone calls an endpoint
- Safer - catch problems before deployment

### What Is Validated:

- ✅ All required variables are set
- ✅ Values have the correct type (string, number)
- ✅ Values satisfy conditions (e.g., default, optional)

---

## 📝 Examples in Your Project

### API Route (server-side)

```typescript
// src/pages/api/v1/workouts.ts
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  // ... remaining code
}
```

### AI Service

```typescript
// src/lib/services/aiSuggestionsService.ts
import {
  OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_TIMEOUT_MS,
  OPENROUTER_MAX_RETRIES,
} from "astro:env/server";
import { PUBLIC_SITE_URL } from "astro:env/server"; // also available server-side

async function generateSuggestion() {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": PUBLIC_SITE_URL,
    },
    body: JSON.stringify({
      model: OPENROUTER_DEFAULT_MODEL, // string, no ?? "default" needed
    }),
  });

  // timeout is already a number; no parseInt needed!
  const timeoutId = setTimeout(() => {
    abort();
  }, OPENROUTER_TIMEOUT_MS);
}
```

---

## 🚀 Next Steps

1. **Run `npm run dev`** - Astro automatically generates types
2. **Replace `import.meta.env.X`** with `import { X } from "astro:env/server"` or `"astro:env/client"`
3. **Remove manual parsing** - `parseInt(import.meta.env.X)` → use `X` directly
4. **Enjoy type safety!** - TypeScript will warn about errors

---

## ⚠️ Limitations

**You CANNOT use `astro:env` in:**

- `astro.config.mjs` - use `process.env`
- Build scripts (`package.json` scripts) - use `process.env`
- `.ts` files outside the Astro context (e.g., standalone utilities) - use `process.env`

**Only in the Astro context:**

- ✅ API routes (`src/pages/api/**/*.ts`)
- ✅ Middleware (`src/middleware.ts`)
- ✅ Astro components (`.astro`)
- ✅ Endpoints (`.ts` in `src/pages/`)

---

## 📚 Documentation

- [Astro Environment Variables Guide](https://docs.astro.build/en/guides/environment-variables/)
- [Astro:env API Reference](https://docs.astro.build/en/reference/configuration-reference/#env)
