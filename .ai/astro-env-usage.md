# Astro:env - Type-Safe Environment Variables

## ✅ Co zostało skonfigurowane

W `astro.config.mjs` i `astro.config.cloudflare.mjs` dodano `env.schema` z trzema typami zmiennych:

### 1. **Public Client Variables** (dostępne w przeglądarce)
```typescript
PUBLIC_SITE_URL: string
```

### 2. **Public Server Variables** (tylko server-side, nie tajne)
```typescript
OPENROUTER_DEFAULT_MODEL: string
OPENROUTER_TIMEOUT_MS: number
OPENROUTER_MAX_RETRIES: number
```

### 3. **Secret Server Variables** (tylko server-side, tajne)
```typescript
SUPABASE_URL: string
SUPABASE_KEY: string
SUPABASE_SERVICE_ROLE_KEY: string
OPENROUTER_API_KEY: string
INTERNAL_ADMIN_TOKEN: string
```

---

## 📖 Jak używać w kodzie

### **Server-side (API routes, middleware, Astro components)**

```typescript
// src/pages/api/v1/example.ts
import { SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY } from "astro:env/server";
import { OPENROUTER_DEFAULT_MODEL, OPENROUTER_TIMEOUT_MS } from "astro:env/server";

export async function GET() {
  // Używaj zmiennych z pełną type safety
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_DEFAULT_MODEL, // TypeScript wie że to string
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
  // Tylko PUBLIC_SITE_URL jest dostępne w przeglądarce
  return (
    <div>
      <p>Site URL: {PUBLIC_SITE_URL}</p>
      {/* ❌ NIE MOŻESZ: import { SUPABASE_KEY } from "astro:env/client" */}
      {/* To spowoduje błąd kompilacji - secret variables nie są dostępne w client */}
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

// W Astro component frontmatter masz dostęp do OBUDWU
const canonicalUrl = `${PUBLIC_SITE_URL}/`;
const supabaseUrl = SUPABASE_URL; // Tylko server-side
---

<html>
  <head>
    <link rel="canonical" href={canonicalUrl} />
  </head>
  <body>
    <h1>Welcome</h1>
    <!-- W template możesz używać tylko zmiennych zdefiniowanych w frontmatter -->
  </body>
</html>

<script>
  // W <script> masz dostęp tylko do client variables
  import { PUBLIC_SITE_URL } from "astro:env/client";
  console.log("Site:", PUBLIC_SITE_URL);
</script>
```

---

## 🔒 Bezpieczeństwo

### ✅ Bezpieczne (Server-only)
```typescript
import { OPENROUTER_API_KEY } from "astro:env/server";
// ✅ OK - używane tylko w API route
```

### ❌ Niebezpieczne (próba użycia w kliencie)
```typescript
// src/components/BadExample.tsx
import { OPENROUTER_API_KEY } from "astro:env/client";
// ❌ BŁĄD KOMPILACJI - secret variables nie są dostępne w client
```

---

## 🎯 Type Safety

TypeScript automatycznie generuje typy:

```typescript
import { OPENROUTER_TIMEOUT_MS } from "astro:env/server";

// TypeScript WIE że to number
const timeout: number = OPENROUTER_TIMEOUT_MS; // ✅ OK

const timeout2: string = OPENROUTER_TIMEOUT_MS;
// ❌ BŁĄD: Type 'number' is not assignable to type 'string'
```

---

## 🔄 Migracja z `import.meta.env`

### Przed (stary sposób):
```typescript
const supabaseUrl = import.meta.env.SUPABASE_URL; // type: string | undefined
const timeout = import.meta.env.OPENROUTER_TIMEOUT_MS; // type: string | undefined

// Trzeba parsować i walidować ręcznie
const timeoutNumber = parseInt(timeout ?? "30000");
```

### Po (nowy sposób z astro:env):
```typescript
import { SUPABASE_URL, OPENROUTER_TIMEOUT_MS } from "astro:env/server";

// Już jest poprawnego typu i zwalidowane!
const supabaseUrl = SUPABASE_URL; // type: string
const timeout = OPENROUTER_TIMEOUT_MS; // type: number (nie trzeba parsować!)
```

---

## ⚙️ Walidacja

### Startup Validation (włączona w config)
```javascript
env: {
  schema: { /* ... */ },
  validateSecrets: true, // ← Walidacja przy starcie
}
```

**Co to daje:**
- Aplikacja NIE wystartuje jeśli brakuje wymaganych zmiennych
- Błąd pojawi się OD RAZU, nie dopiero gdy ktoś wywoła endpoint
- Bezpieczniejsze - wyłapujesz problemy przed deploymentem

### Co jest walidowane:
- ✅ Czy wszystkie wymagane zmienne są ustawione
- ✅ Czy wartości są poprawnego typu (string, number)
- ✅ Czy wartości spełniają warunki (np. default, optional)

---

## 📝 Przykłady w Twoim projekcie

### API Route (server-side)
```typescript
// src/pages/api/v1/workouts.ts
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} from "astro:env/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  // ... reszta kodu
}
```

### AI Service
```typescript
// src/lib/services/aiSuggestionsService.ts
import {
  OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_TIMEOUT_MS,
  OPENROUTER_MAX_RETRIES
} from "astro:env/server";
import { PUBLIC_SITE_URL } from "astro:env/server"; // też dostępne server-side

async function generateSuggestion() {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": PUBLIC_SITE_URL,
    },
    body: JSON.stringify({
      model: OPENROUTER_DEFAULT_MODEL, // string, nie trzeba ?? "default"
    }),
  });

  // timeout jest już number, nie trzeba parseInt!
  const timeoutId = setTimeout(() => {
    abort();
  }, OPENROUTER_TIMEOUT_MS);
}
```

---

## 🚀 Następne kroki

1. **Uruchom `npm run dev`** - Astro automatycznie wygeneruje typy
2. **Zamień `import.meta.env.X`** na `import { X } from "astro:env/server"` lub `"astro:env/client"`
3. **Usuń ręczne parsowanie** - `parseInt(import.meta.env.X)` → bezpośrednio używaj `X`
4. **Ciesz się type safety!** - TypeScript będzie ostrzegał o błędach

---

## ⚠️ Ograniczenia

**NIE możesz używać `astro:env` w:**
- `astro.config.mjs` - użyj `process.env`
- Build scripts (`package.json` scripts) - użyj `process.env`
- Pliki `.ts` poza kontekstem Astro (np. standalone utils) - użyj `process.env`

**Tylko w kontekście Astro:**
- ✅ API routes (`src/pages/api/**/*.ts`)
- ✅ Middleware (`src/middleware.ts`)
- ✅ Astro components (`.astro`)
- ✅ Endpoints (`.ts` w `src/pages/`)

---

## 📚 Dokumentacja

- [Astro Environment Variables Guide](https://docs.astro.build/en/guides/environment-variables/)
- [Astro:env API Reference](https://docs.astro.build/en/reference/configuration-reference/#env)
