<div align="center">

# 🏪 MiTienda — Landing & Onboarding

**De la primera visita al catálogo generado por IA, en menos de 5 minutos.**

[![Astro](https://img.shields.io/badge/Astro-6.x-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.x_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Deno](https://img.shields.io/badge/Deno-2.x-000000?style=for-the-badge&logo=deno&logoColor=white)](https://deno.com)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI-6C47FF?style=for-the-badge&logo=openai&logoColor=white)](https://openrouter.ai)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/Sunshide12/EcommerceMT-Landing/pulls)
[![TypeScript: 82%](https://img.shields.io/badge/TypeScript-82%25-3178C6?style=flat-square&logo=typescript)](https://github.com/Sunshide12/EcommerceMT-Landing)
[![Astro: 16%](https://img.shields.io/badge/Astro-16%25-BC52EE?style=flat-square&logo=astro)](https://github.com/Sunshide12/EcommerceMT-Landing)

</div>

---
<img width="1897" height="825" alt="image" src="https://github.com/user-attachments/assets/3ba157c3-1203-4e2a-9f3f-54239626989a" />
<img width="1310" height="545" alt="image" src="https://github.com/user-attachments/assets/31cd57ab-f372-4445-99d6-b2162fd754c3" />
---

## 🎯 ¿Qué es este proyecto?

**MiTienda Landing** es el portal de adquisición y onboarding para comerciantes de la plataforma MiTienda. El usuario llega a la home, rellena el formulario con los datos de su tienda, sube imágenes de sus productos y luego visualiza su catálogo de tienda online generado automáticamente por IA.

### ¿Qué hace exactamente?

- **Registra** al comerciante via Google OAuth o email/contraseña
- **Configura** nombre de tienda, categoría y subdominio con validación en tiempo real
- **Recibe imágenes** de productos via drag & drop, subiéndolas directamente a Cloudflare R2
- **Procesa automáticamente** cada imagen con visión artificial (Gemini 2.0 Flash / Qwen / Llama) para extraer nombre, marca, precio sugerido y descripción
- **Muestra un preview** interactivo del catálogo con editor de recorte de imágenes y selector de temas

> ⚠️ **Scope de este repo:** El panel de admin, Stripe Connect y el storefront público en producción están en desarrollo.
---

## 🎬 Demo del flujo

```
https://mitienda.com
        │
        ▼
[/]  Landing hero + CTA
        │
        ▼
[/register]  Registro (Google OAuth o email/password)
        │
        ▼
[/setup]  Nombre + categoría + slug con check de disponibilidad en vivo
        │
        ▼
[/upload?storeId=...]  Drag & drop de hasta 6 imágenes → proxy → R2
        │
        ▼
[/processing?storeId=...]  Barra de progreso en tiempo real (Supabase Realtime)
        │
        ▼
[/preview/:storeId]  Catálogo generado con editor de imagen inline
        │
        ▼
[slug.mitienda.com]  Storefront público (cuando is_active = true)
```

---
<img width="1228" height="2410" alt="localhost_4321_preview_edb00390-e967-4d41-af2c-155e3e754d6b" src="https://github.com/user-attachments/assets/4775036e-306b-483f-8e45-36a5c9983394" />

---

## 🗺 Posición en el ecosistema

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                               │
│                                                                  │
│  ┌───────────────────────────┐  ┌───────────────────────────┐    │
│  │   mitienda-landing        │  │   mitienda-frontend       │    │
│  │   ★ ESTE REPOSITORIO     │  │   (proyecto en desarrollo)│    │
│  │   Astro 6 + React 19      │  │   React 19 + Vite         │    │
│  │   SSR — server mode       │  │   SPA                     │    │
│  │   mitienda.com            │  │   *.mitienda.com          │    │
│  └────────────┬──────────────┘  └────────────┬──────────────┘    │
│               │                              │                   │
│  ┌────────────▼──────────────────────────────▼────────────────┐  │
│  │                    Cloudflare R2                           │  │
│  │          Bucket: mitienda-assets                           │  │
│  │          Path: {store_id}/products/{uuid}-{filename}       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────▼────────────────┐
               │           SUPABASE             │
               │     (proyecto compartido)      │
               │                                │
               │   PostgreSQL + RLS             │
               │   Auth (Google OAuth + email)  │
               │   Edge Functions (Deno 2)      │
               │   Realtime (tabla ai_jobs)     │
               └────────────────────────────────┘
```

---

## 🛠 Stack tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|---|---|---|
| **Astro** | 6.x | Framework SSR completo (`output: 'server'`) con Islands |
| **@astrojs/react** | 5.x | Islands interactivos: formularios, uploader, preview |
| **@astrojs/cloudflare** | 13.x | Adaptador SSR para Cloudflare Workers |
| **@astrojs/sitemap** | 3.x | Generación automática de `sitemap.xml` |
| **React** | 19.x | Componentes de cliente (Islands) |
| **Tailwind CSS** | v4 | Estilos via `@tailwindcss/vite` — sin archivo de config |
| **TypeScript** | 6.x | Tipado estático en todo el proyecto |

### Librerías de UI y UX

| Librería | Versión | Propósito |
|---|---|---|
| **react-easy-crop** | 5.x | Editor de recorte/zoom/rotación no-destructivo |
| **sonner** | 2.x | Toast notifications |
| **lucide-react** | latest | Iconos SVG optimizados |
| **clsx + tailwind-merge** | latest | Merge de clases Tailwind sin conflictos |
| **class-variance-authority** | latest | Variantes de componentes type-safe |
| **zod** | v4 | Validación de formularios en cliente |

### Backend / Infraestructura

| Tecnología | Versión | Propósito |
|---|---|---|
| **@supabase/supabase-js** | v2 | Auth, DB y Realtime en cliente |
| **@supabase/ssr** | latest | Auth basada en cookies para SSR |
| **Supabase Edge Functions** | Deno 2 | Proxy de upload + pipeline de IA |
| **Cloudflare R2** | — | Almacenamiento de imágenes (S3-compatible) |
| **OpenRouter** | — | Gateway multi-modelo para visión artificial |
| **Wrangler** | 4.x | CLI de Cloudflare Workers |

### Modelos de IA (via OpenRouter)

| Modelo | Rol |
|---|---|
| `google/gemini-2.0-flash-001` | Principal — OCR + JSON estructurado |
| `qwen/qwen-2-vl-7b-instruct` | Fallback #1 — excelente en texto |
| `meta-llama/llama-3.2-11b-vision-instruct` | Fallback #2 — Llama Vision |

---

## 🏗️ Arquitectura

### Patrón Islands (Astro)

Astro renderiza todo el HTML en el servidor. Solo los componentes que necesitan interactividad en el cliente se hidratan como "islands":

```
Página SSR (Astro)
├── HTML estático (SEO, performance)
└── Islands React (client:load)
    ├── RegisterForm    → auth con Supabase
    ├── SetupForm       → validación de slug en tiempo real
    ├── ImageUploader   → drag & drop + proxy a R2
    ├── AIProcessingStatus → suscripción Realtime
    └── StorePreview    → preview interactivo + editor de imagen
```

### Upload de imágenes (proxy pattern)

El upload directo browser→R2 causa `ERR_CONNECTION_TIMED_OUT`. La solución es un proxy server-to-server:

```
Browser
  │  (binary body + headers de metadata)
  ▼
Supabase Edge Function: upload-to-r2
  │  (aws4fetch — request firmado con SigV4)
  ▼
Cloudflare R2
  │
  └─ Retorna: { path: "storeId/products/uuid-filename.jpg" }
```

### Pipeline de IA (background processing)

```
Frontend invoca process-product-images
  │
  ▼
Edge Function crea ai_jobs { status: 'processing' }
  │  (retorna inmediatamente al cliente)
  ▼
EdgeRuntime.waitUntil(background task)
  │
  ├─ Para cada imagen:
  │   ├─ Descarga de R2 → base64
  │   ├─ Llama a OpenRouter (Gemini → Qwen → Llama, fallback secuencial)
  │   └─ INSERT en products { name, brand, price, description, ai_generated: true }
  │
  └─ UPDATE ai_jobs { status: 'done' }
       │
       ▼  (Supabase Realtime)
  AIProcessingStatus.tsx detecta el cambio y redirige a /preview
```

### Non-destructive image editing

Las imágenes originales en R2 **nunca se modifican**. Los parámetros de recorte se guardan como JSONB en `products.image_crop` y se aplican en el cliente via `<canvas>`:

```typescript
// products.image_crop (JSONB)
{
  "crop": { "x": 0, "y": 0 },   // posición del crop
  "zoom": 1.2,                   // nivel de zoom
  "rotation": 90,                // grados
  "pixels": { "x": 0, "y": 0, "width": 300, "height": 300 }
}
```

`CroppedImage.tsx` recibe estos params y aplica la transformación en un `<canvas>` siguiendo el algoritmo de `react-easy-crop` para que el resultado sea pixel-perfect.

---

## 📁 Estructura del proyecto

```
EcommerceMT-Landing/
│
├── 📄 astro.config.mjs           # SSR server mode, Cloudflare adapter, Tailwind plugin
├── 📄 wrangler.jsonc             # Config Cloudflare Workers (nombre, assets, compat flags)
├── 📄 tsconfig.json              # Strict mode, path alias @/*
├── 📄 package.json
├── 📄 .env.example
│
├── 📁 public/
│   ├── _redirects                # www → apex redirect (301)
│   ├── _headers                  # Cache-Control por ruta + cabeceras de seguridad
│   ├── robots.txt                # Bloquea rutas de onboarding para crawlers
│   └── fonts/
│       ├── inter-latin.woff2     # Peso 400
│       └── inter-latin-bold.woff2 # Peso 700
│
├── 📁 supabase/
│   ├── config.toml               # Config CLI local (puertos, auth, realtime, storage)
│   └── functions/
│       ├── upload-to-r2/         # ★ Proxy de subida server-to-server
│       │   └── index.ts
│       ├── process-product-images/ # ★ Pipeline IA con fallback multi-modelo
│       │   └── index.ts
│       ├── provision-subdomain/  # Activa is_active en stores
│       │   └── index.ts
│       └── generate-r2-presigned-url/ # (legacy — reemplazado por upload-to-r2)
│           └── index.ts
│
└── 📁 src/
    ├── env.d.ts                  # Tipado de import.meta.env
    ├── middleware.ts             # Guarda de rutas + intercepción de OAuth codes
    │
    ├── lib/
    │   ├── supabase.ts           # createServerClient() + createBrowserClient()
    │   ├── r2.ts                 # r2Path() + r2PublicUrl()
    │   └── utils.ts              # cn() — merge de clases Tailwind
    │
    ├── types/
    │   └── index.ts              # Store, Product, CropParams, AIJob, AIJobStatus
    │
    ├── services/
    │   ├── upload.ts             # uploadFilesToR2() — llama a la Edge Function
    │   └── ai.ts                 # triggerAIProcessing() — invoca process-product-images
    │
    ├── styles/
    │   └── global.css            # @font-face Inter, @theme tokens, reset
    │
    ├── layouts/
    │   ├── BaseLayout.astro      # HTML base: meta, OG, Twitter Card, fonts
    │   └── OnboardingLayout.astro # Barra de progreso (pasos 1–6)
    │
    ├── components/
    │   ├── auth/
    │   │   └── RegisterForm.tsx  # Google OAuth + email/password + strength indicator
    │   ├── islands/
    │   │   ├── SetupForm.tsx     # Nombre + categoría + slug con debounce check
    │   │   ├── ImageUploader.tsx # Drag & drop, validación, proxy upload, max 6 imgs
    │   │   ├── AIProcessingStatus.tsx # Realtime + polling fallback + retry handler
    │   │   ├── StorePreview.tsx  # Preview completo: temas, modo oscuro, categorías
    │   │   ├── ImageEditorModal.tsx  # Modal con react-easy-crop + zoom + rotación
    │   │   └── CroppedImage.tsx  # Renderiza crop params vía canvas
    │   └── ui/
    │       ├── Button.astro      # Variantes primary/secondary/ghost + tamaños
    │       └── Spinner.astro     # Spinner accesible con aria-label
    │
    └── pages/
        ├── index.astro           # / — Landing hero, how-it-works, CTA
        ├── register.astro        # /register — Paso 2
        ├── setup.astro           # /setup — Paso 3
        ├── upload.astro          # /upload?storeId=... — Paso 4
        ├── processing.astro      # /processing?storeId=... — Paso 5
        ├── preview/
        │   └── [storeId].astro   # /preview/:id — Paso 6 (solo el owner)
        ├── [store_slug]/
        │   └── index.astro       # Storefront público (is_active = true)
        └── api/
            ├── check-slug.ts     # GET /api/check-slug?slug=... → { available: bool }
            └── auth/
                └── callback.ts   # GET /api/auth/callback — exchange OAuth code
```

---

## 🚦 Flujo de onboarding paso a paso

| Paso | Ruta | Render | Island | Supabase |
|---|---|---|---|---|
| 1 | `/` | SSR | ❌ Astro puro | — |
| 2 | `/register` | SSR | `RegisterForm` | `auth.signUp` / `signInWithOAuth` |
| 3 | `/setup` | SSR | `SetupForm` | INSERT `stores`, INSERT `categories` |
| 4 | `/upload?storeId=` | SSR | `ImageUploader` | Edge Function `upload-to-r2` |
| 5 | `/processing?storeId=` | SSR | `AIProcessingStatus` | Realtime `ai_jobs` |
| 6 | `/preview/:storeId` | SSR | `StorePreview` + `ImageEditorModal` | SELECT `products`, `categories`, `stores` |
| — | `/[store_slug]` | SSR | — | SELECT stores + products (público) |

### Protección de rutas (middleware)

`src/middleware.ts` actúa sobre cada request:

- Rutas `/setup`, `/upload`, `/processing`, `/preview/*` → requieren sesión activa. Sin ella, redirect a `/register`.
- Si la URL contiene `?code=` (callback de OAuth) y el usuario aterrizó en una ruta equivocada, el middleware captura el code y lo redirige a `/api/auth/callback`.

---

## ⚡ Supabase Edge Functions

Todas las funciones viven en `supabase/functions/` y se despliegan con `supabase functions deploy`.

### `upload-to-r2`

Proxy server-to-server para subir archivos a R2 sin que el navegador abra una conexión directa (lo que causa timeouts en muchas redes).

```
POST (binary body del archivo)
Headers:
  x-store-id:     <uuid de la tienda>
  x-file-name:    <nombre original del archivo>
  x-content-type: <image/jpeg | image/png | image/webp>

Response:
  { "path": "storeId/products/uuid-filename.jpg" }
```

**Secrets necesarios:**

| Secret | Descripción |
|---|---|
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key de R2 (S3-compatible) |
| `R2_SECRET_ACCESS_KEY` | Secret Key de R2 |
| `R2_BUCKET_NAME` | Nombre del bucket (ej: `mitienda-assets`) |

---

### `process-product-images`

Orquesta el pipeline de extracción de metadata de producto con IA. Devuelve `{ jobId, status: 'processing' }` inmediatamente y procesa en background con `EdgeRuntime.waitUntil`.

```
POST { storeId: string, r2Paths: string[] }

Response inmediata:
  { "jobId": "uuid", "status": "processing" }
```

**Cadena de fallback de modelos (secuencial):**

```
1. google/gemini-2.0-flash-001  → principal (mejor en OCR y JSON)
2. qwen/qwen-2-vl-7b-instruct   → fallback #1
3. meta-llama/llama-3.2-11b-vision-instruct → fallback #2
```

Prompt enviado a la IA:
```
Analiza la imagen y devuelve SOLO un JSON con:
{
  "name": "nombre comercial",
  "brand": "fabricante (NO el vendedor)",
  "model": "modelo específico",
  "price": null,
  "description": "copy persuasivo de máx 150 chars"
}
```

**Secrets necesarios:**

| Secret | Descripción |
|---|---|
| `OPENROUTER_API_KEY` | API key de OpenRouter |
| `R2_PUBLIC_URL` | URL base pública del bucket |
| `SUPABASE_URL` | Auto-inyectada por Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-inyectada por Supabase |

---

### `provision-subdomain`

Activa `is_active = true` en la tabla `stores` para la tienda dada. En producción puede extenderse para crear un registro CNAME en Cloudflare DNS.

```
POST { storeId: string }
Response: { "success": true, "storeId": "uuid" }
```

---

### `generate-r2-presigned-url` *(legacy)*

Generaba URLs prefirmadas para upload directo desde el browser. Reemplazado por `upload-to-r2` por problemas de timeouts en redes lentas. Se mantiene en el repo por compatibilidad hacia atrás.

---

## 🗄️ Base de datos

El schema vive en el proyecto Supabase compartido. Las migraciones se gestionan desde `supabase/`.

### Diagrama de relaciones

```
auth.users
    │
    └─ 1:N ─── stores
                  │
                  ├─ 1:N ─── products (image_crop: jsonb)
                  ├─ 1:N ─── categories
                  └─ 1:N ─── ai_jobs ← Realtime habilitado
```

### `stores`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
owner_id      uuid NOT NULL REFERENCES auth.users(id)
name          text NOT NULL
slug          text NOT NULL UNIQUE  -- a-z, 0-9, guión (3–30 chars)
is_active     boolean NOT NULL DEFAULT false
dns_record_id text                  -- ID del CNAME en Cloudflare (opcional)
created_at    timestamptz NOT NULL DEFAULT now()
```

RLS: INSERT/SELECT/UPDATE solo si `auth.uid() = owner_id`

### `products`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
name          text NOT NULL
description   text
price         numeric(10,2)
category      text        -- marca del fabricante (extraída por la IA)
image_url     text        -- URL completa del objeto en R2
image_crop    jsonb       -- CropParams: { crop, zoom, rotation, pixels }
ai_generated  boolean NOT NULL DEFAULT false
created_at    timestamptz NOT NULL DEFAULT now()
```

RLS: SELECT por owner del store; INSERT/UPDATE solo desde Edge Functions (service role key)

### `categories`

```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
name       text NOT NULL
sort_order integer DEFAULT 0
```

### `ai_jobs`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
status      text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'processing', 'done', 'error'))
r2_paths    text[]    -- paths de las imágenes a procesar
result_json jsonb     -- respuesta completa de la IA (para debugging)
error_msg   text      -- mensaje si status = 'error'
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
```

> ⚠️ **Importante:** `REPLICA IDENTITY FULL` debe estar habilitado para que Supabase Realtime transmita los cambios correctamente:
> ```sql
> ALTER TABLE ai_jobs REPLICA IDENTITY FULL;
> ```
> Activar también en Dashboard → Database → Replication → `ai_jobs`.

### Script de inicialización

```sql
-- Ejecutar en el SQL Editor de Supabase si las tablas no existen

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

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Añadir columna de recorte si no existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_crop jsonb;
```

---

## 🔐 Variables de entorno

### Frontend — `.env` (Cloudflare Pages)

Copia `.env.example` y rellena cada valor:

```bash
cp .env.example .env
```

| Variable | Descripción | ¿Pública? |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |
| `PUBLIC_R2_PUBLIC_URL` | URL base pública del bucket R2 | ✅ |
| `PUBLIC_SENTRY_DSN` | DSN de Sentry (monitoreo de errores) | ✅ |
| `SENTRY_AUTH_TOKEN` | Token para sourcemaps en CI | ❌ |
| `SITE_URL` | Override de `site` en `astro.config` (útil con ngrok) | ❌ |

### Edge Functions — Supabase Secrets

Configurar con `supabase secrets set NOMBRE=valor` o desde el Dashboard → Edge Functions → Secrets:

| Secret | Edge Function |
|---|---|
| `R2_ACCOUNT_ID` | `upload-to-r2` |
| `R2_ACCESS_KEY_ID` | `upload-to-r2` |
| `R2_SECRET_ACCESS_KEY` | `upload-to-r2` |
| `R2_BUCKET_NAME` | `upload-to-r2` |
| `R2_PUBLIC_URL` | `process-product-images` |
| `OPENROUTER_API_KEY` | `process-product-images` |
| `CLOUDFLARE_API_TOKEN` | `provision-subdomain` |
| `CLOUDFLARE_ZONE_ID` | `provision-subdomain` |
| `CLOUDFLARE_PAGES_PROJECT_CNAME` | `provision-subdomain` |

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son auto-inyectadas por el runtime de Supabase Edge Functions.

---

## 🚀 Instalación local

### Prerrequisitos

```bash
node --version   # >= 20.x LTS requerido
npm --version    # >= 10.x
```

También necesitas tener acceso al **proyecto Supabase compartido**. No crees uno nuevo — este proyecto comparte DB y bucket R2 con `mitienda-frontend`.

### Paso 1 — Clonar e instalar dependencias

```bash
git clone https://github.com/Sunshide12/EcommerceMT-Landing.git
cd EcommerceMT-Landing
npm install
```

### Paso 2 — Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y añade las credenciales del proyecto Supabase:

```env
PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
PUBLIC_R2_PUBLIC_URL=https://pub-xxx.r2.dev
PUBLIC_SENTRY_DSN=                           # opcional en dev
SENTRY_AUTH_TOKEN=                           # opcional en dev
```

### Paso 3 — Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321) en el navegador.

### Paso 4 *(opcional)* — Levantar Supabase en local

Si quieres desarrollar las Edge Functions sin tocar el proyecto de producción:

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Inicializar y levantar Supabase local
supabase start

# Desplegar las Edge Functions localmente
supabase functions serve

# Establecer secrets locales
supabase secrets set R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=yyy ...
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR (puerto 4321) |
| `npm run build` | Build de producción para Cloudflare Workers |
| `npm run preview` | Preview del build local (simula el runtime de Cloudflare) |
| `npm run check` | Verificación de tipos en archivos `.astro` y `.ts` |
| `npm run generate-types` | Genera tipos de Cloudflare Workers via Wrangler |

---

## ☁️ Deploy en Cloudflare Pages

### 1. Configuración del proyecto en Cloudflare

En el Dashboard de Cloudflare Pages → Create project → Connect to Git:

| Campo | Valor |
|---|---|
| Framework preset | **Astro** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20.x` |

### 2. Variables de entorno en Cloudflare Pages

Añadir en Settings → Environment variables (solo las variables `PUBLIC_*`; las secrets de Edge Functions van en Supabase):

```
PUBLIC_SUPABASE_URL        → Production + Preview
PUBLIC_SUPABASE_ANON_KEY   → Production + Preview
PUBLIC_R2_PUBLIC_URL       → Production + Preview
PUBLIC_SENTRY_DSN          → Production (solo)
```

### 3. Configuración de dominio

En Cloudflare DNS:

```
CNAME  @    →  mitienda-landing.pages.dev  (Proxied ✅)
CNAME  www  →  mitienda.com               (Proxied ✅ + redirect 301)
```

El archivo `public/_redirects` ya maneja el redirect `www` → apex:

```
/www/*  https://mitienda.com/:splat  301
```

### 4. Desplegar Edge Functions en Supabase

```bash
# Desplegar todas las funciones
supabase functions deploy upload-to-r2
supabase functions deploy process-product-images
supabase functions deploy provision-subdomain

# Configurar secrets de producción
supabase secrets set \
  R2_ACCOUNT_ID=xxx \
  R2_ACCESS_KEY_ID=yyy \
  R2_SECRET_ACCESS_KEY=zzz \
  R2_BUCKET_NAME=mitienda-assets \
  R2_PUBLIC_URL=https://pub-xxx.r2.dev \
  OPENROUTER_API_KEY=sk-or-...
```

---

## 🔒 Consideraciones de seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las reglas más críticas:

```sql
-- stores: un comerciante solo ve/edita su propia tienda
CREATE POLICY "stores_owner" ON stores
  USING (auth.uid() = owner_id);

-- products: solo legible por el dueño del store
CREATE POLICY "products_owner_read" ON products
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- ai_jobs: INSERT/UPDATE solo desde service role (Edge Functions)
-- Los usuarios pueden leer sus propios jobs para el Realtime feed
```

### Cabeceras de seguridad

`public/_headers` aplica cabeceras en la raíz:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS en Edge Functions

Todas las Edge Functions responden a `OPTIONS` con headers CORS permisivos para desarrollo. **En producción, reemplaza `Access-Control-Allow-Origin: *` con el dominio exacto:**

```typescript
'Access-Control-Allow-Origin': 'https://mitienda.com'
```

### Validación del slug

El endpoint `/api/check-slug` valida el formato con regex antes de consultar la DB:

```
/^[a-z0-9-]{3,30}$/
```

---

## 🗺 Roadmap y decisiones técnicas

### ¿Por qué Astro en lugar de Next.js?

- **Performance:** Astro envía 0 KB de JavaScript por defecto. Solo los Islands se hidratan.
- **Islands Architecture:** perfecto para un funnel donde la mayoría de las páginas son contenido estático con un formulario interactivo.
- **Cloudflare Workers:** el adaptador oficial `@astrojs/cloudflare` compila a Workers Edge, con latencias globales mínimas.

### ¿Por qué proxy de upload y no presigned URLs?

Las URLs prefirmadas (v1 — `generate-r2-presigned-url`) fallaban en redes lentas con `ERR_CONNECTION_TIMED_OUT` porque el browser mantenía la conexión TCP abierta durante el PUT. El proxy via Edge Function resuelve esto porque la conexión browser→Supabase es rápida (HTTPS/2) y la de Supabase→R2 es server-to-server.

### ¿Por qué Realtime + polling en la pantalla de procesamiento?

Realtime es más responsivo, pero existe una race condition: si el job termina antes de que se establezca la suscripción WebSocket, el usuario se queda bloqueado para siempre. La solución es doble:

1. **Polling** cada 3 segundos como fallback garantizado
2. **Realtime** como canal principal para velocidad

### Scope protection (MVP)

Las siguientes features están **fuera del scope de este repo** por decisión de arquitectura:

- 💳 Stripe Connect y pagos
- 🌐 Dominios personalizados (solo subdominios `slug.mitienda.com`)
- 👤 Gestión de perfil (cambio de contraseña, avatar)
- 📦 Panel de admin de pedidos
- 🔄 Recuperación granular de errores en el pipeline de IA

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor sigue estos pasos:

```bash
# 1. Crea un fork y clona tu fork
git clone https://github.com/TU_USUARIO/EcommerceMT-Landing.git

# 2. Crea una rama descriptiva
git checkout -b feat/nombre-de-la-feature

# 3. Haz tus cambios y verifica tipos
npm run check

# 4. Commit con mensaje semántico
git commit -m "feat: añadir soporte para imágenes AVIF en el uploader"

# 5. Abre un Pull Request contra main
```

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: refactorización sin cambio de comportamiento
docs:     cambios en documentación
chore:    cambios en build/config/dependencias
```

---

<div align="center">

**MiTienda Landing** · Construido con ❤️ usando Astro, Supabase y Cloudflare

*Última actualización: mayo 2026 — MVP v1.0*

</div>
