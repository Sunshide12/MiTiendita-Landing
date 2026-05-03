# mitienda-landing

> Landing page de adquisición y onboarding de MiTienda — desde el primer clic hasta el preview del catálogo generado por IA.

![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?logo=astro&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white)
![Node](https://img.shields.io/badge/Node-%3E%3D20.x_LTS-339933?logo=node.js&logoColor=white)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue)

---

## Índice

1. [Posición en el ecosistema](#1-posición-en-el-ecosistema)
2. [Stack tecnológico completo](#2-stack-tecnológico-completo)
3. [Arquitectura del proyecto](#3-arquitectura-del-proyecto)
4. [Flujo paso a paso — implementación técnica](#4-flujo-paso-a-paso--implementación-técnica)
5. [Supabase Edge Functions requeridas](#5-supabase-edge-functions-requeridas)
6. [Base de datos — tablas que usa esta landing](#6-base-de-datos--tablas-que-usa-esta-landing)
7. [SEO — estrategia completa](#7-seo--estrategia-completa)
8. [Variables de entorno](#8-variables-de-entorno)
9. [Instalación y configuración local](#9-instalación-y-configuración-local)
10. [Scripts de package.json](#10-scripts-de-packagejson)
11. [Deploy en Cloudflare Pages](#11-deploy-en-cloudflare-pages)
12. [Checklist de producción](#12-checklist-de-producción)
13. [Roadmap](#13-roadmap)

---

## 1. Posición en el ecosistema

Esta landing es **un proyecto separado** del frontend principal de tiendas. Ambos comparten el mismo proyecto Supabase pero son aplicaciones y deploys independientes en Cloudflare Pages.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                               │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │   mitienda-landing       │  │   mitienda-frontend      │    │
│  │   (este proyecto)        │  │   (proyecto existente)   │    │
│  │                          │  │                          │    │
│  │   Astro 5 + React 19     │  │   React 19 + Vite 6      │    │
│  │   SSG + SSR              │  │   SPA                    │    │
│  │                          │  │                          │    │
│  │   mitienda.com           │  │   *.mitienda.com         │    │
│  │   (dominio raíz)         │  │   (wildcard subdominio)  │    │
│  └────────────┬─────────────┘  └───────────┬──────────────┘    │
│               │                             │                   │
│  ┌────────────▼─────────────────────────────▼──────────────┐   │
│  │                  Cloudflare R2                           │   │
│  │         Bucket compartido: mitienda-assets               │   │
│  │         Path: {store_id}/products/{product_id}/{file}    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────▼───────────────┐
              │         SUPABASE              │
              │   (proyecto compartido)       │
              │                               │
              │   PostgreSQL + RLS            │
              │   Auth (Google + email)       │
              │   Edge Functions (Deno)       │
              │   Realtime                    │
              └───────────────────────────────┘
```

**Regla fundamental:** La landing captura y hace el onboarding del nuevo comerciante (pasos 1–6). La activación de la tienda, Stripe Connect, el panel de administración y la tienda pública para compradores pertenecen al frontend principal.

---

## 2. Stack tecnológico completo

### Core Astro

| Tecnología | Versión | Propósito |
|---|---|---|
| Astro | 5.x | Framework principal — SSG + SSR + Islands |
| @astrojs/react | latest | Integración de React como island renderer |
| @astrojs/tailwind | latest | Plugin oficial Tailwind para Astro |
| @astrojs/sitemap | latest | Generación automática de sitemap.xml |
| @astrojs/cloudflare | latest | Adaptador SSR para Cloudflare Pages |

### UI y estilos

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 19.x | Islands interactivos (formularios, uploader, preview) |
| Tailwind CSS | v4 | Estilos utility-first (coherente con frontend principal) |
| class-variance-authority | latest | Variantes de componentes tipadas |
| clsx + tailwind-merge | latest | Merge seguro de clases Tailwind |
| lucide-react | latest | Iconos SVG accesibles |
| framer-motion | latest | Animaciones de entrada en la landing |

### Auth y datos

| Tecnología | Versión | Propósito |
|---|---|---|
| @supabase/supabase-js | v2 | Cliente Supabase — auth, DB, realtime |
| @supabase/ssr | latest | Helpers SSR para Astro (cookies-based auth) |
| zod | latest | Validación de formularios en islands |

### Infraestructura

| Tecnología | Versión | Propósito |
|---|---|---|
| @cloudflare/workers-types | latest | Tipos TypeScript para el entorno de Cloudflare |
| wrangler | latest | CLI de Cloudflare para deploy y desarrollo local |

### SEO

| Tecnología | Versión | Propósito |
|---|---|---|
| @astrojs/sitemap | latest | sitemap.xml automático con rutas SSG |
| schema-dts | latest | Tipos TypeScript para Schema.org / JSON-LD |

### Analytics y monitoreo

| Tecnología | Versión | Propósito |
|---|---|---|
| @sentry/astro | latest | Monitoreo de errores (coherente con frontend principal) |
| @vercel/analytics | — | No usar — la alternativa es Cloudflare Web Analytics (nativo) |

> **Cloudflare Web Analytics** es la opción recomendada: sin cookies, compatible con GDPR, gratuito, y se activa desde el dashboard sin instalar nada.

---

## 3. Arquitectura del proyecto

```
mitienda-landing/
├── astro.config.ts                  # Config principal: integraciones, adaptador CF, sitemap
├── tailwind.config.ts               # Config Tailwind v4
├── tsconfig.json                    # TypeScript strict mode
├── wrangler.toml                    # Config Cloudflare Pages (bindings R2 si aplica)
├── package.json
├── .env                             # Variables locales (NO commitear)
├── .env.example                     # Plantilla de variables (sí commitear)
│
├── public/
│   ├── _redirects                   # Reglas de redirección Cloudflare Pages
│   ├── _headers                     # Cabeceras HTTP (caché, seguridad)
│   ├── robots.txt                   # Reglas para crawlers
│   ├── favicon.svg
│   ├── og-image.jpg                 # Imagen Open Graph 1200×630
│   └── fonts/
│       ├── inter-latin.woff2        # Fuente principal (subsetted)
│       └── inter-latin-bold.woff2
│
└── src/
    ├── env.d.ts                     # Tipos globales de variables de entorno
    │
    ├── lib/
    │   ├── supabase.ts              # Clientes Supabase: server (SSR) y browser
    │   ├── r2.ts                    # Helper r2Path() — coherente con frontend principal
    │   └── utils.ts                 # cn(), formatCurrency(), sleep()
    │
    ├── types/
    │   ├── supabase.ts              # AUTO-GENERADO: supabase gen types typescript
    │   └── index.ts                 # Tipos de dominio: Store, Product, AIJob
    │
    ├── styles/
    │   └── global.css               # Fuentes, variables CSS, reset mínimo
    │
    ├── layouts/
    │   ├── BaseLayout.astro          # HTML base, meta tags, JSON-LD, fuentes
    │   └── OnboardingLayout.astro   # Layout de los pasos 2-6 (barra de progreso)
    │
    ├── components/                  # Componentes Astro puros (sin JS en cliente)
    │   ├── seo/
    │   │   ├── MetaTags.astro       # title, description, OG, Twitter Card, canonical
    │   │   └── JsonLd.astro         # Inyecta <script type="application/ld+json">
    │   ├── landing/
    │   │   ├── Hero.astro           # Sección hero con CTA principal
    │   │   ├── HowItWorks.astro     # Sección "3 pasos" — mapea al Schema HowTo
    │   │   ├── Features.astro       # Grid de características
    │   │   ├── Testimonials.astro   # Social proof
    │   │   ├── FAQ.astro            # Preguntas frecuentes — mapea al Schema FAQPage
    │   │   └── Footer.astro
    │   └── ui/
    │       ├── Button.astro         # Botón base reutilizable
    │       ├── ProgressBar.astro    # Barra de progreso del onboarding (pasos 2-6)
    │       └── Spinner.astro        # Loading state
    │
    ├── islands/                     # Componentes React — hidratados en el cliente
    │   ├── RegisterForm.tsx         # Paso 2: Google OAuth + email/password
    │   ├── SetupForm.tsx            # Paso 3: nombre, negocio, subdominio
    │   ├── ImageUploader.tsx        # Paso 4: drag & drop + subida a R2
    │   ├── AIProcessingStatus.tsx   # Paso 5: polling del estado del job de IA
    │   └── CatalogPreview.tsx       # Paso 6: grid de productos generados
    │
    └── pages/
        ├── index.astro              # SSG — Landing principal (el core del SEO)
        ├── register.astro           # SSR — Paso 2: registro
        ├── setup.astro              # SSR — Paso 3: configuración básica
        ├── upload.astro             # SSR — Paso 4: subida de fotos
        ├── processing.astro         # SSR — Paso 5: espera del procesamiento IA
        ├── preview/
        │   └── [storeId].astro      # SSR — Paso 6: preview del catálogo
        └── api/
            └── check-slug.ts        # SSR endpoint: verifica disponibilidad del subdominio
```

### Archivos clave explicados

| Archivo | Por qué existe |
|---|---|
| `src/lib/supabase.ts` | Exporta dos clientes distintos: uno para SSR (usa cookies del request de Astro) y otro para el browser (islands de React). Crítico para que la auth funcione en SSR. |
| `src/islands/ImageUploader.tsx` | El único componente que necesita estado complejo en cliente: maneja el drag & drop, solicita presigned URLs a la Edge Function, sube directamente a R2 y notifica cuando termina. |
| `src/islands/AIProcessingStatus.tsx` | Hace polling a Supabase Realtime o a la tabla `ai_jobs` cada 2s hasta que el status sea `done` o `error`. Muestra progreso visual por imagen. |
| `public/_headers` | Define caché agresivo para assets con hash y cabeceras de seguridad (CSP, HSTS). Cloudflare Pages lo lee nativamente. |
| `astro.config.ts` | Configura el adaptador `@astrojs/cloudflare` para SSR, lista las integraciones y define qué rutas son SSG vs SSR. |

---

## 4. Flujo paso a paso — implementación técnica

### Paso 1 — Landing page (`/`)

**Archivo:** `src/pages/index.astro` — renderizado en build time (SSG).

**Componentes Astro (sin JS en cliente):**
- `Hero.astro` — titular H1 con keyword principal, subtítulo, CTA "Crea tu tienda gratis" → `/register`
- `HowItWorks.astro` — 3 pasos visuales (Sube fotos → IA genera tu catálogo → Activa y vende)
- `Features.astro` — grid de 6 características con iconos SVG inline
- `FAQ.astro` — 5 preguntas frecuentes con acordeón en CSS puro (sin JS)
- `Footer.astro` — links, redes sociales, legal

**No hay llamadas a Supabase.** Es HTML puro generado en build time.

**Supabase:** ninguna.

**Estado de UI:** página estática, sin estados de carga.

```astro
---
// src/pages/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import Hero from '@/components/landing/Hero.astro';
import HowItWorks from '@/components/landing/HowItWorks.astro';
import Features from '@/components/landing/Features.astro';
import FAQ from '@/components/landing/FAQ.astro';
import Footer from '@/components/landing/Footer.astro';

const seo = {
  title: 'MiTienda — Crea tu tienda online gratis en 5 minutos',
  description: 'Sube las fotos de tus productos y nuestra IA crea tu catálogo automáticamente. Sin conocimientos técnicos. Empieza gratis hoy.',
  canonical: 'https://mitienda.com',
};
---

<BaseLayout {seo}>
  <Hero />
  <HowItWorks />
  <Features />
  <FAQ />
  <Footer />
</BaseLayout>
```

---

### Paso 2 — Registro (`/register`)

**Archivo:** `src/pages/register.astro` — SSR.

**Island de React:** `RegisterForm.tsx` — hidratado inmediatamente (`client:load`).

**Por qué island:** el formulario necesita estado reactivo para Google OAuth (redirect) y el flujo email/password con validación en tiempo real.

**Supabase Auth:**
- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/setup' })`
- Email/password: `supabase.auth.signUp({ email, password })` → email de confirmación → redirect a `/setup`
- RLS: ninguna tabla se lee/escribe en este paso. Solo se crea el usuario en `auth.users`.

```astro
---
// src/pages/register.astro
export const prerender = false; // SSR

import { createServerClient } from '@/lib/supabase';
import OnboardingLayout from '@/layouts/OnboardingLayout.astro';
import RegisterForm from '@/islands/RegisterForm';

// Si ya está autenticado, saltar al setup
const supabase = createServerClient(Astro.cookies);
const { data: { user } } = await supabase.auth.getUser();
if (user) return Astro.redirect('/setup');
---

<OnboardingLayout step={1} title="Crea tu cuenta">
  <RegisterForm client:load />
</OnboardingLayout>
```

```tsx
// src/islands/RegisterForm.tsx
import { createBrowserClient } from '@/lib/supabase';
import { useState } from 'react';

export default function RegisterForm() {
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/setup` },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleEmail(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/setup` },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  // ... render del formulario
}
```

**Estado de UI:**
- Cargando: spinner en el botón
- Error: mensaje inline bajo el campo correspondiente
- Éxito (email): "Revisa tu correo para confirmar tu cuenta"
- Éxito (Google): redirect automático a `/setup`

---

### Paso 3 — Configuración básica (`/setup`)

**Archivo:** `src/pages/setup.astro` — SSR.

**Island de React:** `SetupForm.tsx` — `client:load`.

**Supabase:**
- Lee: `auth.users` (verificar sesión activa)
- Escribe: tabla `stores` → INSERT con `{ owner_id: user.id, name, slug, is_active: false }`
- RLS policy requerida: `INSERT` solo si `auth.uid() = owner_id`

**Edge Function:** `provision-subdomain` — se llama después del INSERT exitoso en `stores`.

**Endpoint Astro:** `src/pages/api/check-slug.ts` — GET con `?slug=minegocio` → verifica que no exista ya en `stores`.

```ts
// src/pages/api/check-slug.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.toLowerCase().trim();

  if (!slug || !/^[a-z0-9-]{3,30}$/.test(slug)) {
    return new Response(JSON.stringify({ available: false, reason: 'formato-invalido' }), { status: 400 });
  }

  const supabase = createServerClient(cookies);
  const { data } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();

  return new Response(JSON.stringify({ available: !data }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Estado de UI:**
- Campo slug: validación en tiempo real con debounce (check-slug endpoint)
- Disponible: indicador verde ✓
- No disponible: indicador rojo con sugerencias alternativas
- Submit: spinner → si OK, redirect a `/upload`

---

### Paso 4 — Subida de fotos (`/upload`)

**Archivo:** `src/pages/upload.astro` — SSR.

**Island de React:** `ImageUploader.tsx` — `client:load`.

**Flujo de subida:**
1. Usuario selecciona o arrastra imágenes (drag & drop nativo del browser)
2. `ImageUploader` llama a la Edge Function `generate-r2-presigned-url` por cada archivo
3. La Edge Function devuelve una URL firmada de R2 con expiración de 15 minutos
4. `ImageUploader` hace `fetch(presignedUrl, { method: 'PUT', body: file })` directamente a R2
5. Al terminar todas las subidas, llama a la Edge Function `process-product-images` con los paths

```tsx
// src/islands/ImageUploader.tsx (fragmento crítico)
import { createBrowserClient } from '@/lib/supabase';

async function uploadFile(file: File, storeId: string): Promise<string> {
  const supabase = createBrowserClient();

  // 1. Solicitar presigned URL a la Edge Function
  const { data, error } = await supabase.functions.invoke('generate-r2-presigned-url', {
    body: {
      storeId,
      filename: file.name,
      contentType: file.type,
    },
  });
  if (error) throw new Error(error.message);

  const { presignedUrl, r2Path } = data as { presignedUrl: string; r2Path: string };

  // 2. Subir directamente a R2 (no pasa por Astro ni Supabase)
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!uploadResponse.ok) throw new Error('Error al subir la imagen');

  return r2Path; // ej: "abc-123/products/xyz-456/zapatilla.jpg"
}

async function triggerAIProcessing(storeId: string, r2Paths: string[]) {
  const supabase = createBrowserClient();
  const { error } = await supabase.functions.invoke('process-product-images', {
    body: { storeId, r2Paths },
  });
  if (error) throw new Error(error.message);
}
```

**Supabase:** solo se invoca Edge Functions. No hay escritura directa desde este island.

**Estado de UI:**
- Zona de drop: borde punteado, cambia a sólido en drag-over
- Por cada archivo: nombre, thumbnail pequeño, barra de progreso individual
- Al terminar: "✓ X fotos subidas — Generando tu catálogo..." → redirect automático a `/processing`

---

### Paso 5 — Procesamiento IA (`/processing`)

**Archivo:** `src/pages/processing.astro` — SSR.

**Island de React:** `AIProcessingStatus.tsx` — `client:load`.

**Lógica:** el island hace polling a la tabla `ai_jobs` cada 2 segundos hasta que `status = 'done'` o `status = 'error'`. Alternativamente puede usar Supabase Realtime para escuchar cambios en la fila del job.

```tsx
// src/islands/AIProcessingStatus.tsx
import { createBrowserClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type JobStatus = 'pending' | 'processing' | 'done' | 'error';

export default function AIProcessingStatus({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<JobStatus>('pending');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Opción A: Realtime (recomendado)
    const channel = supabase
      .channel(`ai_job_${storeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_jobs',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const job = payload.new as { status: JobStatus; result_json: unknown };
        setStatus(job.status);
        if (job.status === 'done') {
          window.location.href = `/preview/${storeId}`;
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  // ... render con animación de progreso
}
```

**RLS policy requerida:** SELECT en `ai_jobs` donde `store_id` pertenece al usuario autenticado.

**Estado de UI:**
- Animación de carga con texto que rota: "Analizando tus productos...", "Generando descripciones...", "Calculando precios sugeridos..."
- Si error: mensaje claro con botón para reintentar → llama de nuevo a `process-product-images`

---

### Paso 6 — Preview del catálogo (`/preview/[storeId]`)

**Archivo:** `src/pages/preview/[storeId].astro` — SSR.

**Island de React:** `CatalogPreview.tsx` — `client:load` (para animaciones de entrada).

**Supabase:**
- Lee: tabla `products` → `SELECT * FROM products WHERE store_id = :storeId`
- Lee: tabla `stores` → `SELECT name, slug FROM stores WHERE id = :storeId`
- RLS policy requerida: SELECT en `products` donde `store_id` en stores del usuario autenticado.

```astro
---
// src/pages/preview/[storeId].astro
export const prerender = false;

import { createServerClient } from '@/lib/supabase';
import OnboardingLayout from '@/layouts/OnboardingLayout.astro';
import CatalogPreview from '@/islands/CatalogPreview';

const { storeId } = Astro.params;
const supabase = createServerClient(Astro.cookies);

// Verificar que el store pertenece al usuario autenticado
const { data: { user } } = await supabase.auth.getUser();
if (!user) return Astro.redirect('/register');

const { data: store } = await supabase
  .from('stores')
  .select('id, name, slug')
  .eq('id', storeId)
  .eq('owner_id', user.id)
  .single();

if (!store) return Astro.redirect('/setup');

const { data: products } = await supabase
  .from('products')
  .select('id, name, description, price, category, image_url')
  .eq('store_id', storeId)
  .order('created_at', { ascending: true });
---

<OnboardingLayout step={6} title={`¡Así quedó ${store.name}!`}>
  <CatalogPreview
    client:load
    store={store}
    products={products ?? []}
    activateUrl={`https://${store.slug}.mitienda.com/admin`}
  />
</OnboardingLayout>
```

**Estado de UI:**
- Grid de tarjetas de productos: imagen generada, nombre, descripción IA, precio sugerido
- Badge "Generado por IA" en cada tarjeta
- CTA destacado: "Activar mi tienda" → redirige al frontend principal (`*.mitienda.com`)
- Botón secundario: "Editar productos" → enlaza directamente al admin del frontend principal

---

## 5. Supabase Edge Functions requeridas

Todas las Edge Functions viven en el repositorio del backend de Supabase (no en este repo). Se documentan aquí para que el desarrollador de la landing sepa qué esperar de cada una.

### `generate-r2-presigned-url`

| Campo | Valor |
|---|---|
| Trigger | HTTP POST — llamada desde `ImageUploader.tsx` vía `supabase.functions.invoke()` |
| Auth requerida | Sí — Bearer token de Supabase (`Authorization` header) |

**Input:**
```json
{
  "storeId": "uuid",
  "filename": "zapatilla-blanca.jpg",
  "contentType": "image/jpeg"
}
```

**Output:**
```json
{
  "presignedUrl": "https://r2.cloudflarestorage.com/mitienda-assets/abc.../zapatilla-blanca.jpg?X-Amz-Signature=...",
  "r2Path": "abc-store-id/products/xyz-product-id/zapatilla-blanca.jpg",
  "expiresAt": "2026-05-03T14:30:00Z"
}
```

**Tablas:** ninguna lectura/escritura. Solo genera la URL y crea un `product_id` (UUID) para el path.

**Variables de entorno necesarias en la Edge Function:**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

---

### `process-product-images`

| Campo | Valor |
|---|---|
| Trigger | HTTP POST — llamada desde `ImageUploader.tsx` al terminar todas las subidas |
| Auth requerida | Sí |

**Input:**
```json
{
  "storeId": "uuid",
  "r2Paths": [
    "abc-store-id/products/uuid1/zapatilla.jpg",
    "abc-store-id/products/uuid2/bolso.jpg"
  ]
}
```

**Output** (respuesta inmediata — el procesamiento continúa en background):
```json
{
  "jobId": "uuid",
  "status": "pending",
  "message": "Procesamiento iniciado. Escucha cambios en ai_jobs."
}
```

**Lógica interna:**
1. Inserta una fila en `ai_jobs` con `status = 'pending'`
2. Para cada path en `r2Paths`:
   a. Descarga la imagen desde R2 (URL pública o signed URL de lectura)
   b. Llama a Gemini Vision API o Claude con visión
   c. Extrae JSON: `{ name, description, price, category }`
   d. Inserta en `products` con `ai_generated = true`
3. Actualiza `ai_jobs` a `status = 'done'`

**Tablas:**
- `ai_jobs`: INSERT (pending) → UPDATE (processing → done/error)
- `products`: INSERT por cada imagen procesada

**Variables de entorno:**
- `GEMINI_API_KEY` o `ANTHROPIC_API_KEY`
- `R2_PUBLIC_URL` (para construir URLs de lectura)

---

### `provision-subdomain`

| Campo | Valor |
|---|---|
| Trigger | HTTP POST — llamada desde `SetupForm.tsx` tras INSERT exitoso en `stores` |
| Auth requerida | Sí |

**Input:**
```json
{
  "slug": "minegocio",
  "storeId": "uuid"
}
```

**Output:**
```json
{
  "success": true,
  "fqdn": "minegocio.mitienda.com",
  "dnsRecordId": "cloudflare-dns-record-id"
}
```

**Lógica interna:**
1. Llama a Cloudflare API: `POST /zones/{zoneId}/dns_records`
2. Crea un CNAME: `minegocio.mitienda.com → mitienda-frontend.pages.dev`
3. Actualiza `stores` con el `dns_record_id` para poder eliminar el CNAME si la tienda se cancela

**Tablas:** `stores` → UPDATE `dns_record_id`

**Variables de entorno:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_PAGES_PROJECT_CNAME` (ej: `mi-tienda-frontend.pages.dev`)

---

## 6. Base de datos — tablas que usa esta landing

> El schema completo pertenece al README del backend. Aquí solo se documentan los campos y policies relevantes para la landing.

### `stores`

```sql
-- Campos relevantes para esta landing
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
owner_id    uuid NOT NULL REFERENCES auth.users(id)
name        text NOT NULL
slug        text NOT NULL UNIQUE  -- subdominio deseado, solo a-z, 0-9, guión
is_active   boolean NOT NULL DEFAULT false
dns_record_id text              -- ID del registro CNAME en Cloudflare
created_at  timestamptz NOT NULL DEFAULT now()
```

**RLS policies necesarias:**
```sql
-- INSERT: solo el usuario autenticado puede crear su propia tienda
CREATE POLICY "users_insert_own_store" ON stores
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- SELECT: el usuario solo ve sus propias tiendas
CREATE POLICY "users_select_own_stores" ON stores
  FOR SELECT USING (auth.uid() = owner_id);

-- UPDATE: el usuario solo actualiza sus propias tiendas
CREATE POLICY "users_update_own_stores" ON stores
  FOR UPDATE USING (auth.uid() = owner_id);
```

---

### `products`

```sql
-- Campos relevantes para esta landing
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
name         text NOT NULL
description  text
price        numeric(10,2)
category     text
image_url    text              -- URL pública del objeto en R2
ai_generated boolean NOT NULL DEFAULT false
created_at   timestamptz NOT NULL DEFAULT now()
```

**RLS policies necesarias:**
```sql
-- SELECT: el dueño de la tienda puede leer sus productos
CREATE POLICY "store_owner_select_products" ON products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- INSERT: solo desde Edge Functions con service role key (no desde el cliente)
-- La landing no inserta productos directamente.
```

---

### `ai_jobs`

```sql
-- Tabla de seguimiento del procesamiento IA
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE
status       text NOT NULL DEFAULT 'pending'
             -- valores: 'pending' | 'processing' | 'done' | 'error'
result_json  jsonb           -- resultado completo del job para debugging
error_msg    text            -- mensaje de error si status = 'error'
created_at   timestamptz NOT NULL DEFAULT now()
updated_at   timestamptz NOT NULL DEFAULT now()
```

**RLS policies necesarias:**
```sql
-- SELECT: el dueño puede ver el estado de su job
CREATE POLICY "store_owner_select_ai_jobs" ON ai_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = ai_jobs.store_id
        AND stores.owner_id = auth.uid()
    )
  );

-- INSERT y UPDATE: solo desde Edge Functions (service role key)
```

**Activar Realtime en esta tabla:**
```sql
-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;
```

Y en el Dashboard: Database → Replication → activar `ai_jobs`.

---

## 7. SEO — estrategia completa

### 7.1 Meta tags por ruta

| Ruta | index | title | description | OG image | canonical |
|---|---|---|---|---|---|
| `/` | ✅ | `MiTienda — Crea tu tienda online gratis en 5 minutos` | `Sube fotos de tus productos y nuestra IA genera tu catálogo. Sin conocimientos técnicos.` | `/og-image.jpg` | `https://mitienda.com` |
| `/register` | ❌ noindex | `Crea tu cuenta — MiTienda` | — | — |
| `/setup` | ❌ noindex | `Configura tu tienda — MiTienda` | — | — |
| `/upload` | ❌ noindex | `Sube tus productos — MiTienda` | — | — |
| `/processing` | ❌ noindex | `Generando tu catálogo — MiTienda` | — | — |
| `/preview/*` | ❌ noindex | `Preview de tu tienda — MiTienda` | — | — |

```astro
---
// src/components/seo/MetaTags.astro
interface Props {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

const {
  title,
  description,
  canonical,
  ogImage = 'https://mitienda.com/og-image.jpg',
  noindex = false,
} = Astro.props;
---

<title>{title}</title>
{description && <meta name="description" content={description} />}
{noindex && <meta name="robots" content="noindex, nofollow" />}
{canonical && <link rel="canonical" href={canonical} />}

<meta property="og:title" content={title} />
{description && <meta property="og:description" content={description} />}
<meta property="og:image" content={ogImage} />
<meta property="og:url" content={canonical ?? 'https://mitienda.com'} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MiTienda" />
<meta property="og:locale" content="es_ES" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
{description && <meta name="twitter:description" content={description} />}
<meta name="twitter:image" content={ogImage} />
```

---

### 7.2 Schema.org / JSON-LD

Todos los schemas se inyectan en `BaseLayout.astro` solo para la ruta `/`. Las rutas de onboarding no los necesitan.

```astro
---
// src/components/seo/JsonLd.astro
// Solo renderizar en la landing principal
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://mitienda.com/#website",
      "url": "https://mitienda.com",
      "name": "MiTienda",
      "description": "Crea tu tienda online gratis con IA",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://mitienda.com/buscar?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://mitienda.com/#organization",
      "name": "MiTienda",
      "url": "https://mitienda.com",
      "logo": "https://mitienda.com/logo.svg",
      "sameAs": [
        "https://twitter.com/mitienda",
        "https://instagram.com/mitienda",
        "https://linkedin.com/company/mitienda"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "hola@mitienda.com",
        "availableLanguage": "Spanish"
      }
    },
    {
      "@type": "SoftwareApplication",
      "name": "MiTienda",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "312"
      }
    },
    {
      "@type": "HowTo",
      "name": "Cómo crear una tienda online gratis con MiTienda",
      "description": "Crea tu tienda en 3 pasos sin conocimientos técnicos",
      "totalTime": "PT5M",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Sube las fotos de tus productos",
          "text": "Arrastra o selecciona las fotos de los productos que quieres vender."
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Nuestra IA genera tu catálogo",
          "text": "La inteligencia artificial extrae nombre, descripción y precio sugerido de cada producto automáticamente."
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Activa tu tienda y empieza a vender",
          "text": "Conecta tu cuenta bancaria y tu tienda estará lista para recibir pedidos en minutos."
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Cuánto cuesta crear una tienda en MiTienda?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Crear tu tienda es completamente gratis. Solo pagas una comisión cuando realizas ventas."
          }
        },
        {
          "@type": "Question",
          "name": "¿Necesito conocimientos técnicos para usar MiTienda?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Solo necesitas fotos de tus productos. Nuestra IA se encarga de crear las descripciones, sugerir precios y organizar tu catálogo."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cuánto tiempo tarda en estar lista mi tienda?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "En menos de 5 minutos. El proceso de inteligencia artificial es automático y ocurre en segundos por producto."
          }
        },
        {
          "@type": "Question",
          "name": "¿Puedo usar mi propio dominio?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sí. Tu tienda incluye un subdominio gratuito (tunegocio.mitienda.com) y puedes conectar tu dominio propio desde el panel de administración."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cómo recibo el dinero de mis ventas?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Los pagos se procesan a través de Stripe. El dinero se deposita directamente en tu cuenta bancaria de forma automática."
          }
        }
      ]
    }
  ]
}
</script>
```

---

### 7.3 Core Web Vitals

**LCP (Largest Contentful Paint) — objetivo < 2.5s:**
```astro
<!-- En Hero.astro — imagen principal con prioridad máxima -->
<Image
  src={heroImage}
  alt="Ejemplo de tienda creada con MiTienda"
  width={800}
  height={500}
  fetchpriority="high"
  loading="eager"
  format="avif"
/>
```

**CLS (Cumulative Layout Shift) — objetivo < 0.1:**
```astro
<!-- Siempre reservar espacio para imágenes con aspect-ratio -->
<div style="aspect-ratio: 16/10; width: 100%;">
  <Image src={...} width={800} height={500} style="width:100%;height:100%;object-fit:cover" />
</div>
```

**INP (Interaction to Next Paint) — objetivo < 200ms:**
- Los islands de React en las rutas de onboarding usan `client:load` (hidratación inmediata).
- La landing principal `/` no tiene islands — es HTML puro, INP no aplica.
- Los acordeones del FAQ usan la etiqueta `<details>/<summary>` del navegador, sin JS.

**Objetivo Lighthouse:** Performance ≥ 95 · SEO 100 · Accessibility 100 · Best Practices 100.

---

### 7.4 Sitemap y robots.txt

```ts
// astro.config.ts
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mitienda.com',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/register') &&
        !page.includes('/setup') &&
        !page.includes('/upload') &&
        !page.includes('/processing') &&
        !page.includes('/preview'),
    }),
  ],
});
```

```
# public/robots.txt
User-agent: *
Allow: /

Disallow: /register
Disallow: /setup
Disallow: /upload
Disallow: /processing
Disallow: /preview/

Sitemap: https://mitienda.com/sitemap-index.xml
```

---

### 7.5 Keywords objetivo

**Primarias (alto volumen, mercado hispanohablante):**

| Keyword | Intención |
|---|---|
| crear tienda online gratis | transaccional |
| tienda online gratis | transaccional |
| crear tienda en internet | transaccional |
| vender por internet gratis | transaccional |
| plataforma e-commerce España | comercial |
| cómo vender online | informacional |
| crear catálogo online | transaccional |
| tienda virtual gratis | transaccional |
| vender productos online | transaccional |
| e-commerce para pequeños negocios | comercial |

**Secundarias (long tail, menor competencia):**

| Keyword | Intención |
|---|---|
| crear tienda online sin conocimientos técnicos | transaccional |
| tienda online con inteligencia artificial | comercial |
| cómo subir productos a mi tienda online | informacional |
| crear catálogo de productos con fotos | transaccional |
| plataforma para vender ropa online gratis | transaccional |
| tienda online para artesanos | comercial |
| crear tienda en 5 minutos | transaccional |
| vender online sin programar | transaccional |
| alternativa a shopify gratis | comercial |
| tienda online para autónomos España | comercial |

**Estrategia de densidad:**
- El H1 debe contener la keyword primaria principal: "Crea tu tienda online gratis en 5 minutos"
- El primer párrafo del cuerpo (primeros 100 palabras) debe incluir: "tienda online", "vender por internet", "inteligencia artificial"
- Los `alt` de las imágenes deben describir el contenido con keywords naturales
- Los títulos H2 de las secciones deben mapear a keywords informacionales ("¿Cómo crear una tienda online?", "¿Por qué MiTienda?")

---

### 7.6 Fuentes y rendimiento tipográfico

```astro
<!-- En BaseLayout.astro — preload de la fuente crítica -->
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/inter-latin-bold.woff2" as="font" type="font/woff2" crossorigin />
```

```css
/* src/styles/global.css */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212,
    U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

> Generar los archivos `.woff2` subsetteados con [google-webfonts-helper](https://gwfh.mranftl.com/fonts/inter) seleccionando solo el subset `latin`.

---

## 8. Variables de entorno

| Variable | Descripción | Público | Entorno |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ Público | Ambos |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase (safe para el cliente) | ✅ Público | Ambos |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio — NUNCA en el cliente | ❌ Privado | Solo en Edge Functions |
| `PUBLIC_R2_PUBLIC_URL` | URL base pública del bucket R2 | ✅ Público | Ambos |
| `R2_ACCOUNT_ID` | ID de cuenta Cloudflare para R2 | ❌ Privado | Solo Edge Functions |
| `R2_ACCESS_KEY_ID` | Access key para firmar URLs de R2 | ❌ Privado | Solo Edge Functions |
| `R2_SECRET_ACCESS_KEY` | Secret key para firmar URLs de R2 | ❌ Privado | Solo Edge Functions |
| `R2_BUCKET_NAME` | Nombre del bucket R2 | ❌ Privado | Solo Edge Functions |
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con permiso de Zone DNS | ❌ Privado | Solo Edge Functions |
| `CLOUDFLARE_ZONE_ID` | Zone ID del dominio `mitienda.com` | ❌ Privado | Solo Edge Functions |
| `CLOUDFLARE_PAGES_CNAME` | CNAME destino del frontend (ej: `proyecto.pages.dev`) | ❌ Privado | Solo Edge Functions |
| `GEMINI_API_KEY` | API key de Google Gemini Vision | ❌ Privado | Solo Edge Functions |
| `ANTHROPIC_API_KEY` | API key de Anthropic (alternativa a Gemini) | ❌ Privado | Solo Edge Functions |
| `PUBLIC_SENTRY_DSN` | DSN de Sentry para el cliente | ✅ Público | Producción |
| `SENTRY_AUTH_TOKEN` | Token de Sentry para source maps | ❌ Privado | Producción |

> **Importante:** Las variables con prefijo `PUBLIC_` son seguras para exponerse en el navegador. Las demás solo se usan en Supabase Edge Functions (Deno) o en rutas SSR de Astro. **Nunca** usar `SUPABASE_SERVICE_ROLE_KEY` en código que llega al cliente.

```bash
# .env.example — commitear este archivo (sin valores reales)
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
PUBLIC_R2_PUBLIC_URL=https://pub-xxxx.r2.dev
PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 9. Instalación y configuración local

### Prerrequisitos

```bash
node --version   # >= 20.x LTS
npm --version    # >= 10.x
```

Tener el proyecto Supabase ya creado y configurado (ver README-BACKEND.md del frontend principal).

### Paso a paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/mitienda-landing.git
cd mitienda-landing

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
# → Abrir .env y completar con los valores del proyecto Supabase existente

# 4. Regenerar tipos de Supabase (usa el mismo proyecto que el frontend)
npx supabase gen types typescript \
  --project-id tu-project-id \
  --schema public \
  > src/types/supabase.ts

# 5. Levantar servidor de desarrollo
npm run dev
# → http://localhost:4321
```

> **No crear un proyecto Supabase nuevo.** Usar el mismo `SUPABASE_URL` y `SUPABASE_ANON_KEY` del frontend principal. Las tablas `stores`, `products` y `ai_jobs` ya deben existir.

### Crear la tabla `ai_jobs` si no existe

```sql
-- Ejecutar en el SQL Editor de Supabase
CREATE TABLE IF NOT EXISTS ai_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'done', 'error')),
  result_json  jsonb,
  error_msg    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;

CREATE POLICY "store_owner_select_ai_jobs" ON ai_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = ai_jobs.store_id
        AND stores.owner_id = auth.uid()
    )
  );
```

---

## 10. Scripts de package.json

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `astro dev` | Servidor de desarrollo en `localhost:4321` con HMR |
| `build` | `astro build` | Build de producción — SSG + SSR compilado para Cloudflare |
| `preview` | `astro preview` | Preview del build de producción en local |
| `check` | `astro check` | Comprobación de tipos TypeScript en archivos `.astro` |
| `lint` | `eslint src --ext .ts,.tsx,.astro` | Lint de todos los archivos fuente |
| `types:gen` | `supabase gen types typescript --project-id ... > src/types/supabase.ts` | Regenera tipos desde Supabase |
| `cf:deploy` | `wrangler pages deploy dist --project-name=mitienda-landing` | Deploy manual a Cloudflare Pages |
| `cf:dev` | `wrangler pages dev dist` | Simula el entorno de Cloudflare Pages en local |

---

## 11. Deploy en Cloudflare Pages

### 11.1 Crear proyecto separado del frontend

En Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git:

- **Repositorio:** `mitienda-landing` (repo separado del frontend principal)
- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (o `landing/` si es monorepo)

> **Importante:** Este es un proyecto de Cloudflare Pages diferente al del frontend. Tendrás dos proyectos: `mitienda-landing` y `mitienda-frontend`.

### 11.2 Configurar el dominio raíz

El frontend usa `*.mitienda.com` (wildcard). Esta landing usa `mitienda.com` (el dominio raíz).

En el proyecto `mitienda-landing` → Custom domains → Set up a custom domain:
- Añadir `mitienda.com`
- Añadir `www.mitienda.com` → configurar redirect 301 a `mitienda.com`

En Cloudflare DNS:
```
CNAME  mitienda.com  →  mitienda-landing.pages.dev  (proxied)
CNAME  www           →  mitienda.com                (redirect)
```

### 11.3 Variables de entorno en Cloudflare Pages

En `mitienda-landing` → Settings → Environment variables → Production:

```
PUBLIC_SUPABASE_URL           → Production + Preview
PUBLIC_SUPABASE_ANON_KEY      → Production + Preview
PUBLIC_R2_PUBLIC_URL          → Production + Preview
PUBLIC_SENTRY_DSN             → Production
SENTRY_AUTH_TOKEN             → Production
```

> Las variables privadas (`R2_ACCESS_KEY_ID`, `CLOUDFLARE_API_TOKEN`, etc.) van en las Supabase Edge Functions, no aquí.

### 11.4 `astro.config.ts` para Cloudflare

```ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mitienda.com',
  output: 'hybrid',          // SSG por defecto, SSR opt-in por página
  adapter: cloudflare({
    mode: 'advanced',        // Genera un Worker de Cloudflare para SSR
  }),
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !/(register|setup|upload|processing|preview)/.test(page),
    }),
  ],
});
```

### 11.5 `public/_headers`

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=0, must-revalidate
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 11.6 `public/_redirects`

```
/www/*    https://mitienda.com/:splat    301
```

---

## 12. Checklist de producción

### SEO

- [ ] Lighthouse SEO = 100 en producción (verificar con PageSpeed Insights)
- [ ] `<title>` y `<meta name="description">` únicos y con keywords en `/`
- [ ] `robots.txt` bloquea `/register`, `/setup`, `/upload`, `/processing`, `/preview/*`
- [ ] `sitemap.xml` accesible en `https://mitienda.com/sitemap-index.xml`
- [ ] JSON-LD validado en [Rich Results Test](https://search.google.com/test/rich-results) de Google
- [ ] `og:image` de 1200×630 px, peso < 200KB, accesible sin auth
- [ ] `canonical` correcto en la landing principal
- [ ] Google Search Console: dominio verificado y sitemap enviado
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

### Auth

- [ ] Google OAuth funciona en producción (verificar Authorized redirect URIs en Google Cloud Console apuntan a `https://mitienda.com/register` y al callback de Supabase)
- [ ] Email/password: email de confirmación llega y el link redirige a `/setup`
- [ ] Usuarios sin sesión en `/setup`, `/upload`, `/preview/*` son redirigidos a `/register`

### Seguridad

- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca aparece en el código de la landing
- [ ] `.env` en `.gitignore`
- [ ] Cabeceras de seguridad presentes en `_headers`: `X-Frame-Options`, `X-Content-Type-Options`
- [ ] RLS activado en `stores`, `products`, `ai_jobs`
- [ ] El endpoint `check-slug` valida el formato del slug con regex antes de consultar Supabase

### Rendimiento

- [ ] Lighthouse Performance ≥ 95 en producción
- [ ] Imagen hero con `fetchpriority="high"` y formato AVIF
- [ ] Fuentes con `font-display: swap` y archivos `.woff2` subsetteados en `/public/fonts/`
- [ ] Ningún island de React en la ruta `/` (es HTML puro)
- [ ] Build sin chunks > 500KB (verificar con `wrangler pages dev`)

### Accesibilidad

- [ ] Lighthouse Accessibility = 100
- [ ] Todos los `<img>` tienen `alt` descriptivos con keywords naturales
- [ ] El formulario de registro es navegable con teclado
- [ ] El uploader de imágenes tiene `aria-label` y soporte para teclado
- [ ] Contraste de color ≥ 4.5:1 en texto sobre fondo (verificar con axe DevTools)
- [ ] `lang="es"` en la etiqueta `<html>`

### Integración con el ecosistema

- [ ] `src/types/supabase.ts` generado con el proyecto Supabase de producción
- [ ] La Edge Function `provision-subdomain` crea el CNAME correctamente en Cloudflare
- [ ] El redirect al finalizar onboarding apunta al dominio correcto del frontend (`https://{slug}.mitienda.com/admin`)
- [ ] Los paths de R2 siguen el patrón `{store_id}/products/{product_id}/{filename}`

---

## 13. Roadmap

| Feature | Estado | Descripción |
|---|---|---|
| Landing principal + onboarding completo (pasos 1-6) | ✅ Completado | Flujo base documentado en este README |
| Integración Supabase Realtime en `ai_jobs` | 🔄 En progreso | Reemplazar polling por suscripción push |
| Cloudflare Web Analytics | 📋 Planificado | Análisis sin cookies, GDPR-compliant, nativo en CF |
| A/B testing de copy del hero | 📋 Planificado | Usar Cloudflare Workers para split testing sin cookies de terceros |
| Blog SEO con Astro Content Collections | 📋 Planificado | Artículos como "Cómo vender online sin tener tienda física" para capturar tráfico informacional |
| Internacionalización (es / en / pt) | 📋 Planificado | `@astrojs/i18n` para mercados de LATAM, España y Brasil |
| Integración Google Analytics 4 | 📋 Planificado | GA4 con `partytown` de Astro para no bloquear el hilo principal |
| Página de precios | 📋 Planificado | SSG — comparativa de planes, FAQ de precios, Schema `PriceSpecification` |
| Testimonios dinámicos desde Supabase | 📋 Planificado | SSG con revalidación — leer testimonios reales de la tabla `reviews` |
| Preview de la tienda embebido en el onboarding | 📋 Planificado | iframe del frontend principal con el subdominio recién creado |

---

*Última actualización: mayo 2026 — generado para el ecosistema MiTienda (Astro 5 + Supabase + Cloudflare)*