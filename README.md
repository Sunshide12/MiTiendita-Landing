# mitienda-landing

> Landing de adquisición y onboarding de MiTienda — desde el primer clic hasta el preview del catálogo generado por IA.

![Astro](https://img.shields.io/badge/Astro-6.x-BC52EE?logo=astro&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white)
![Node](https://img.shields.io/badge/Node-%3E%3D20.x_LTS-339933?logo=node.js&logoColor=white)

---

## Índice

1. [Posición en el ecosistema](#1-posición-en-el-ecosistema)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Flujo de onboarding](#4-flujo-de-onboarding)
5. [Supabase Edge Functions](#5-supabase-edge-functions)
6. [Base de datos](#6-base-de-datos)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Instalación local](#8-instalación-local)
9. [Deploy en Cloudflare Pages](#9-deploy-en-cloudflare-pages)

---

## 1. Posición en el ecosistema

Esta landing es **un proyecto separado** del frontend público de tiendas. Ambos comparten el mismo proyecto Supabase y bucket R2, pero son deploys independientes.

```
┌──────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE                              │
│                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │
│  │  mitienda-landing       │  │  mitienda-frontend      │    │
│  │  (este proyecto)        │  │  (proyecto existente)   │    │
│  │  Astro 6 + React 19    │  │  React 19 + Vite        │    │
│  │  SSR (server mode)      │  │  SPA                    │    │
│  │  mitienda.com           │  │  *.mitienda.com         │    │
│  └───────────┬─────────────┘  └───────────┬─────────────┘    │
│              │                             │                  │
│  ┌───────────▼─────────────────────────────▼──────────────┐  │
│  │                 Cloudflare R2                           │  │
│  │       Bucket: mitienda-assets                           │  │
│  │       Path: {store_id}/products/{uuid}-{filename}       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             │
             ┌───────────────▼───────────────┐
             │          SUPABASE             │
             │    (proyecto compartido)      │
             │                               │
             │    PostgreSQL + RLS           │
             │    Auth (Google + email)      │
             │    Edge Functions (Deno)      │
             │    Realtime (ai_jobs)         │
             └───────────────────────────────┘
```

**Regla:** La landing captura y hace onboarding del comerciante (pasos 1–6). La tienda pública, Stripe Connect y el panel de admin pertenecen al frontend principal.

---

## 2. Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Astro | 6.x | Framework — full SSR (`output: 'server'`) con Islands |
| @astrojs/react | 5.x | Islands interactivos (formularios, uploader, preview) |
| @astrojs/cloudflare | 13.x | Adaptador SSR para Cloudflare Workers |
| @astrojs/sitemap | 3.x | Generación de sitemap.xml |
| React | 19.x | Islands de cliente |
| Tailwind CSS | v4 | Estilos (via `@tailwindcss/vite` plugin) |
| @supabase/supabase-js | v2 | Cliente Supabase — auth, DB, realtime |
| @supabase/ssr | latest | Helpers SSR para cookies-based auth |
| react-easy-crop | 5.x | Editor de recorte no-destructivo de imágenes |
| sonner | 2.x | Notificaciones toast |
| zod | v4 | Validación de formularios |
| lucide-react | latest | Iconos SVG |
| clsx + tailwind-merge | latest | Merge de clases Tailwind |
| class-variance-authority | latest | Variantes de componentes |

---

## 3. Estructura del proyecto

```
mitienda-landing/
├── astro.config.mjs              # Config: SSR server mode, Cloudflare adapter, Tailwind via Vite
├── wrangler.jsonc                # Cloudflare Workers config
├── tsconfig.json
├── package.json
├── .env / .env.example
│
├── public/
│   ├── _redirects                # Reglas de redirect (Cloudflare Pages)
│   ├── _headers                  # Caché y seguridad
│   ├── robots.txt
│   ├── favicon.svg / favicon.ico
│   ├── og-image.jpg
│   └── fonts/
│       └── inter-latin*.woff2
│
├── supabase/
│   ├── config.toml               # Config local de Supabase
│   └── functions/
│       ├── upload-to-r2/         # Proxy de subida: Browser → Edge Function → R2
│       ├── process-product-images/  # Extracción IA con fallback multi-modelo
│       ├── generate-r2-presigned-url/  # (legacy, reemplazado por upload-to-r2)
│       └── provision-subdomain/  # Crea CNAME en Cloudflare DNS
│
└── src/
    ├── env.d.ts                  # Tipos de variables de entorno
    ├── middleware.ts             # Protección de rutas + intercepción de OAuth codes
    │
    ├── lib/
    │   ├── supabase.ts           # Clientes server (SSR cookies) y browser
    │   ├── r2.ts                 # Helpers: r2Path(), r2PublicUrl()
    │   └── utils.ts              # cn() para merge de clases Tailwind
    │
    ├── types/
    │   └── index.ts              # Tipos de dominio: Store, Product, CropParams, AIJob
    │
    ├── services/
    │   ├── upload.ts             # uploadFilesToR2() — proxy via Edge Function
    │   └── ai.ts                 # triggerAIProcessing() — invoca process-product-images
    │
    ├── styles/
    │   └── global.css            # @font-face Inter, variables CSS, reset
    │
    ├── layouts/
    │   ├── BaseLayout.astro      # HTML base, meta tags, fuentes
    │   └── OnboardingLayout.astro  # Layout con barra de progreso (pasos 2-6)
    │
    ├── components/
    │   ├── auth/
    │   │   └── RegisterForm.tsx  # Google OAuth + email/password con validación
    │   ├── islands/
    │   │   ├── SetupForm.tsx     # Nombre de tienda + slug con validación en vivo
    │   │   ├── ImageUploader.tsx # Drag & drop + subida proxy a R2
    │   │   ├── AIProcessingStatus.tsx  # Realtime listener del job de IA
    │   │   ├── StorePreview.tsx  # Grid de productos + edición inline
    │   │   ├── ImageEditorModal.tsx  # Modal de recorte/rotación no-destructivo
    │   │   └── CroppedImage.tsx  # Renderiza imagen con crop params via canvas
    │   └── ui/
    │       ├── Button.astro
    │       └── Spinner.astro
    │
    └── pages/
        ├── index.astro           # Landing principal
        ├── register.astro        # Paso 2: registro
        ├── setup.astro           # Paso 3: config de tienda
        ├── upload.astro          # Paso 4: subida de fotos
        ├── processing.astro      # Paso 5: procesamiento IA
        ├── preview/
        │   └── [storeId].astro   # Paso 6: preview del catálogo (owner)
        ├── [store_slug]/
        │   └── index.astro       # Storefront público (solo tiendas activas)
        └── api/
            ├── check-slug.ts     # GET — verifica disponibilidad del subdominio
            └── auth/
                └── callback.ts   # GET — intercambia code OAuth por sesión
```

### Archivos clave

| Archivo | Propósito |
|---|---|
| `src/middleware.ts` | Protege rutas `/setup`, `/upload`, `/processing`, `/preview` redirigiendo a `/register` si no hay sesión. Intercepta `?code=` de OAuth que aterrice en rutas incorrectas. |
| `src/services/upload.ts` | Subida proxy: envía el archivo binario a la Edge Function `upload-to-r2` con headers de metadata. Evita timeouts de conexión directa browser→R2. |
| `src/components/islands/CroppedImage.tsx` | Renderiza imágenes aplicando `CropParams` (recorte, zoom, rotación) via canvas. Los parámetros se guardan como JSON en `products.image_crop`. |
| `src/components/islands/StorePreview.tsx` | Grid del catálogo con edición inline de nombre, precio, descripción, y acceso al editor de imagen. |

---

## 4. Flujo de onboarding

```
Landing (/)  →  Register (/register)  →  Setup (/setup)
                                             │
                                             ▼
Preview (/preview/[storeId])  ←  Processing (/processing)  ←  Upload (/upload)
```

| Paso | Ruta | Render | Componente clave | Supabase |
|---|---|---|---|---|
| 1 | `/` | SSR | Astro puro (no islands) | Ninguna |
| 2 | `/register` | SSR | `RegisterForm.tsx` | `auth.signUp` / `auth.signInWithOAuth` |
| 3 | `/setup` | SSR | `SetupForm.tsx` | INSERT `stores` + check-slug API |
| 4 | `/upload` | SSR | `ImageUploader.tsx` | Edge Function `upload-to-r2` |
| 5 | `/processing` | SSR | `AIProcessingStatus.tsx` | Realtime en `ai_jobs` |
| 6 | `/preview/[storeId]` | SSR | `StorePreview.tsx` + `ImageEditorModal.tsx` | SELECT `products`, `categories`, `stores` |

### Storefront público

`/[store_slug]` — Renderiza la tienda pública (solo `is_active = true`). Muestra el catálogo con imágenes recortadas y badge "✦ AI". No requiere autenticación.

---

## 5. Supabase Edge Functions

Todas las Edge Functions están en `supabase/functions/` dentro de este repo.

### `upload-to-r2`

Proxy server-to-server para subir imágenes a R2. Evita los errores `ERR_CONNECTION_TIMED_OUT` de la subida directa desde el browser.

| Campo | Valor |
|---|---|
| Método | POST — binary body del archivo |
| Auth | Bearer token Supabase (automático via `supabase.functions.invoke`) |
| Headers custom | `x-store-id`, `x-file-name`, `x-content-type` |
| Output | `{ path: "{storeId}/products/{uuid}-{filename}" }` |

**Secrets requeridos:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### `process-product-images`

Extrae metadata de producto (nombre, marca, precio, descripción) usando modelos de visión via OpenRouter con fallback secuencial.

| Campo | Valor |
|---|---|
| Método | POST — `{ storeId, r2Paths }` |
| Respuesta | Inmediata: `{ jobId, status: 'processing' }` — procesamiento en background |

**Cadena de fallback de modelos:**
1. `google/gemini-2.0-flash-001` (principal)
2. `qwen/qwen-2-vl-7b-instruct` (fallback)
3. `meta-llama/llama-3.2-11b-vision-instruct` (fallback 2)

**Lógica:**
1. Crea fila en `ai_jobs` con `status = 'processing'`
2. Por cada imagen: descarga de R2 → base64 → API de visión → parsea JSON
3. Inserta cada producto en `products` con `ai_generated = true`
4. Actualiza `ai_jobs` a `status = 'done'` (o `'error'`)

**Secrets requeridos:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_PUBLIC_URL`, `OPENROUTER_API_KEY`

### `provision-subdomain`

Crea un registro CNAME en Cloudflare DNS para el subdominio de la tienda.

**Secrets requeridos:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PAGES_PROJECT_CNAME`

---

## 6. Base de datos

El schema vive en el proyecto Supabase compartido. Tablas utilizadas por esta landing:

### `stores`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
owner_id      uuid NOT NULL REFERENCES auth.users(id)
name          text NOT NULL
slug          text NOT NULL UNIQUE     -- solo a-z, 0-9, guión (3-30 chars)
is_active     boolean NOT NULL DEFAULT false
dns_record_id text                     -- ID del registro CNAME en Cloudflare
created_at    timestamptz NOT NULL DEFAULT now()
```

**RLS:**
- INSERT: `auth.uid() = owner_id`
- SELECT / UPDATE: `auth.uid() = owner_id`

### `products`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
name          text NOT NULL
description   text
price         numeric(10,2)
category      text                     -- almacena la marca del fabricante (AI la extrae)
image_url     text                     -- URL completa del objeto en R2
image_crop    jsonb                    -- parámetros de recorte no-destructivo (CropParams)
ai_generated  boolean NOT NULL DEFAULT false
created_at    timestamptz NOT NULL DEFAULT now()
```

`image_crop` almacena la siguiente estructura JSON:
```json
{
  "crop": { "x": 0, "y": 0 },
  "zoom": 1,
  "rotation": 0,
  "pixels": { "x": 0, "y": 0, "width": 300, "height": 300 }
}
```

Estos parámetros se aplican en el cliente via `<canvas>` (`CroppedImage.tsx`), sin generar archivos de imagen modificados. La imagen original en R2 permanece intacta.

**RLS:**
- SELECT: owner del store via subquery
- INSERT / UPDATE: solo desde Edge Functions con service role key

### `categories`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
name          text NOT NULL
sort_order    integer DEFAULT 0
```

Tabla auxiliar para categorías definidas por el usuario. La página de preview hace fallback a los valores de `products.category` si esta tabla está vacía.

### `ai_jobs`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
status        text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'done', 'error'))
r2_paths      text[]                   -- paths de las imágenes a procesar
result_json   jsonb                    -- resultado completo para debugging
error_msg     text                     -- mensaje de error si status = 'error'
created_at    timestamptz NOT NULL DEFAULT now()
updated_at    timestamptz NOT NULL DEFAULT now()
```

**Realtime habilitado** — `AIProcessingStatus.tsx` escucha cambios via Supabase Realtime:

```sql
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;
-- + activar en Dashboard: Database → Replication → ai_jobs
```

**RLS:**
- SELECT: owner del store via subquery
- INSERT / UPDATE: solo desde Edge Functions con service role key

### Diagrama de relaciones

```
auth.users
  │
  └─ 1:N ─ stores
               │
               ├─ 1:N ─ products (image_crop: jsonb)
               ├─ 1:N ─ categories
               └─ 1:N ─ ai_jobs (realtime)
```

---

## 7. Variables de entorno

### Frontend (Astro / Cloudflare Pages)

| Variable | Descripción | Público |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `PUBLIC_R2_PUBLIC_URL` | URL base pública del bucket R2 | ✅ |
| `PUBLIC_SENTRY_DSN` | DSN de Sentry (monitoreo de errores) | ✅ |
| `SITE_URL` | Overrides `site` en astro.config (opcional, para dev con ngrok) | ❌ |

### Edge Functions (Supabase Secrets)

| Variable | Función que la usa |
|---|---|
| `R2_ACCOUNT_ID` | upload-to-r2 |
| `R2_ACCESS_KEY_ID` | upload-to-r2 |
| `R2_SECRET_ACCESS_KEY` | upload-to-r2 |
| `R2_BUCKET_NAME` | upload-to-r2 |
| `R2_PUBLIC_URL` | process-product-images |
| `OPENROUTER_API_KEY` | process-product-images |
| `SUPABASE_URL` | process-product-images (auto-inyectada) |
| `SUPABASE_SERVICE_ROLE_KEY` | process-product-images (auto-inyectada) |
| `CLOUDFLARE_API_TOKEN` | provision-subdomain |
| `CLOUDFLARE_ZONE_ID` | provision-subdomain |
| `CLOUDFLARE_PAGES_PROJECT_CNAME` | provision-subdomain |

```bash
# .env.example
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_R2_PUBLIC_URL=
PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 8. Instalación local

### Prerrequisitos

```bash
node --version   # >= 20.x LTS
npm --version    # >= 10.x
```

### Paso a paso

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-org/mitienda-landing.git
cd mitienda-landing
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → Completar con los valores del proyecto Supabase

# 3. Levantar servidor de desarrollo
npm run dev
# → http://localhost:4321
```

> **No crear un proyecto Supabase nuevo.** Usar el mismo proyecto compartido con el frontend principal.

### Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `astro dev` | Servidor de desarrollo con HMR |
| `build` | `astro build` | Build de producción para Cloudflare |
| `preview` | `astro preview` | Preview del build en local |
| `check` | `astro check` | Verificación de tipos en `.astro` |
| `generate-types` | `wrangler types` | Genera tipos de Cloudflare Workers |

### Crear tablas (si no existen)

```sql
-- ai_jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'done', 'error')),
  r2_paths     text[],
  result_json  jsonb,
  error_msg    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   integer DEFAULT 0
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Añadir image_crop a products (si no existe)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_crop jsonb;
```

---

## 9. Deploy en Cloudflare Pages

### Proyecto en Cloudflare

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### Dominio

```
CNAME  mitienda.com  →  mitienda-landing.pages.dev  (proxied)
CNAME  www           →  mitienda.com                (redirect 301)
```

### Variables en Cloudflare Pages

Solo las variables `PUBLIC_*` — las secrets de Edge Functions se configuran en Supabase:

```
PUBLIC_SUPABASE_URL        → Production + Preview
PUBLIC_SUPABASE_ANON_KEY   → Production + Preview
PUBLIC_R2_PUBLIC_URL       → Production + Preview
PUBLIC_SENTRY_DSN          → Production
```

---

*Última actualización: mayo 2026 — MiTienda MVP (Astro 6 + Supabase + Cloudflare)*