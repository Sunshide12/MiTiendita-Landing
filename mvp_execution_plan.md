# MiTienda Landing Page: MVP Execution Plan

This document outlines the fastest, most pragmatic path to launching the MiTienda landing page and onboarding flow. It is designed specifically for a solo founder optimizing for speed, clean architecture, and minimal operational overhead.

---

## 1. Weekly Sprint Plan

*Note: As a solo founder, a 3-week timeline for this scope is aggressive but achievable if you strictly avoid scope creep.*

### **Week 1: Foundation, Auth & Discovery**
**Objective:** Get the core infrastructure live, secure the routing, and deploy the static marketing page.

* **Tasks:**
  * Scaffold Astro 5 project with Cloudflare Pages adapter.
  * Configure Tailwind CSS v4 and basic UI tokens.
  * Implement Supabase Auth (SSR cookie-based via `@supabase/ssr`).
  * Build the Static Landing Page (`/` route).
  * Build the Auth Page (`/register` route + React Island).
  * Setup Astro middleware for route protection (`/setup`, `/upload`, etc. redirect to `/register` if unauthenticated).
* **Deliverables:** Live static landing page. Working user registration/login flow.
* **Dependencies:** Supabase project created; Google OAuth credentials configured.
* **End of Week State:** A user can visit the site, read the marketing copy, and create an account. Protected routes correctly redirect unauthorized users.

### **Week 2: Store Provisioning & Edge Integrations**
**Objective:** Allow authenticated users to claim their store and set up the backend scaffolding.

* **Tasks:**
  * Execute DB migrations (`stores`, `products`, `ai_jobs` tables + RLS policies).
  * Create `/api/check-slug.ts` Astro endpoint.
  * Build Store Setup (`/setup` route + React Island with debounced slug check).
  * Stub out Edge Functions in backend repo (`generate-r2-presigned-url`, `process-product-images`, `provision-subdomain`).
  * Integrate `/setup` submission to insert into `stores` and invoke `provision-subdomain`.
* **Deliverables:** Working store creation flow.
* **Dependencies:** Database schema finalized. Edge functions deployed (even if they just return mock success).
* **End of Week State:** A logged-in user can choose a store name, get an available subdomain, and have their store record created in the database.

### **Week 3: The "Wow" Factor (Uploads, AI & Preview)**
**Objective:** Complete the user journey from image upload to the final catalog preview.

* **Tasks:**
  * Configure Cloudflare R2 bucket and CORS policies.
  * Build Image Upload (`/upload` route + drag-and-drop React Island).
  * Implement R2 presigned URL flow in the uploader.
  * Build AI Processing Status (`/processing` route + React Island listening to Supabase Realtime).
  * Build Catalog Preview (`/preview/[storeId]` route fetching from `products`).
* **Deliverables:** Complete MVP onboarding funnel.
* **Dependencies:** Python AI pipeline must be ready to be triggered by the `process-product-images` Edge Function.
* **End of Week State:** The full flow is functional. Users can upload images, watch the real-time AI generation status, and view their generated catalog.

---

## 2. Architecture Planning

### **Module Breakdown**
*   **`src/pages/`**: Astro routing.
    *   `/` (SSG) - No islands, pure HTML/CSS.
    *   `/register` (SSR) - Renders `<RegisterForm client:load />`.
    *   `/setup` (SSR) - Renders `<SetupForm client:load />`.
    *   `/upload` (SSR) - Renders `<ImageUploader client:load />`.
    *   `/processing` (SSR) - Renders `<AIProcessingStatus client:load />`.
    *   `/preview/[storeId]` (SSR) - Renders `<CatalogPreview client:load />` (mostly for animations).
*   **`src/components/islands/`**: React 19 components. Strict rule: Only interactive components go here.
*   **`src/components/ui/`**: Astro components for static UI (buttons, cards, headers, footers).
*   **`src/pages/api/`**: Astro API routes (e.g., `check-slug.ts`).
*   **`src/lib/`**: Supabase clients, utilities, validation schemas.

### **Supabase Client Strategy**
1.  **Server-Side (`@supabase/ssr`)**: Used in Astro middleware and SSR pages to read cookies, verify sessions, and fetch initial data (e.g., verifying store ownership on the `/preview` route).
2.  **Client-Side (`@supabase/supabase-js`)**: Used **only** inside React islands for actions that don't require a page reload:
    *   Auth forms (Google OAuth, Email/Pass).
    *   Supabase Realtime subscriptions (on `/processing`).

### **Astro Output Mode**
*   **Mode:** `hybrid` (Astro 5).
*   The homepage (`/`) is pre-rendered (`export const prerender = true`) for maximum SEO, zero DB calls, and instant loading.
*   All other routes are dynamically rendered (SSR) to read auth cookies and validate user state before sending HTML.

### **R2 Upload Architecture**
1.  User drops files into `<ImageUploader />`.
2.  Island calls Edge Function `generate-r2-presigned-url` via Supabase client, passing filenames/types.
3.  Edge Function validates user auth and returns presigned PUT URLs.
4.  Island executes `fetch(url, { method: 'PUT', body: file })` directly to R2.
5.  On 100% completion, Island calls Edge Function `process-product-images`.

### **Realtime vs Polling**
*   **`/processing`**: **Use Realtime.** The AI generation is the "magic" moment. Realtime updates (e.g., "Analyzing image...", "Writing description...", "Done!") create a premium feel. Polling feels clunky.
*   **Slug Check (`/setup`)**: **Use standard HTTP (Astro API route).** No need for realtime here; a debounced `fetch` to `/api/check-slug` is simpler and cheaper.

---

## 3. Recommended Build Order (Dependency-Aware)

1.  **Database & RLS**: The foundation. If schemas and policies are wrong, the frontend will break.
2.  **Astro + Cloudflare Pages Base**: Prove deployment works early.
3.  **Supabase Auth + Middleware**: Secure the app. You can't build the onboarding funnel without knowing *who* the user is.
4.  **Static Marketing Page (`/`)**: Easy win, gets the brand up and running.
5.  **Astro API (`check-slug.ts`)**: Required for the setup form.
6.  **`/setup` Flow**: Proves DB inserts and basic Edge Function invocation work.
7.  **R2 CORS & Bucket Setup**: Infrastructure prerequisite for uploads.
8.  **`/upload` Flow**: The most complex frontend piece (drag-and-drop, presigned URLs, direct PUTs).
9.  **`/processing` Flow**: Requires the `ai_jobs` table to exist and Realtime to be enabled.
10. **`/preview` Flow**: The easiest SSR page, just reads from `products`.

---

## 4. MVP Scope Protection

> [!WARNING]
> As a solo founder, your biggest enemy is scope creep. **DO NOT build these yet:**

*   **Payment/Stripe Integration:** Handle this on the admin dashboard (`admin.mitienda.com`), not the landing page. The goal here is acquisition and the "Aha!" moment.
*   **Custom Domains:** Only support subdomains (`slug.mitienda.com`) for the MVP. Custom DNS verification is a massive support headache.
*   **Image Cropping/Editing:** Accept images as-is. Let the AI handle them or resize via CSS. Do not build a canvas image editor.
*   **Profile Management:** Changing passwords, updating emails, or managing avatars can wait.
*   **Complex Error Recovery for AI:** If the AI fails, show a generic "Something went wrong, please try again" and a retry button. Do not build granular partial-retry systems yet.

---

## 5. Risk Analysis

> [!CAUTION]
> Watch out for these specific technical bottlenecks:

1.  **Astro SSR + Cloudflare Edge Cookies:** Ensure your Astro middleware correctly sets and reads Supabase cookies on the Cloudflare Pages edge. Misconfigurations here result in endless login loops.
2.  **R2 CORS Configuration:** Direct-to-client uploads will fail silently if your R2 bucket CORS policy doesn't explicitly allow your specific landing page origin and the `PUT` method.
3.  **Realtime Replica Identity:** Supabase Realtime won't broadcast row updates unless you run `ALTER TABLE ai_jobs REPLICA IDENTITY FULL;`.
4.  **Edge Function Cold Starts:** Deno Edge Functions can have cold starts. Add loading states to your UI so users don't think the app froze while waiting for the presigned URL.

---

## 6. Final MVP Checklist

Every item below must be checked before you announce the launch:

* [ ] `robots.txt` and `sitemap.xml` are generated and live.
* [ ] Homepage Core Web Vitals are in the green (Lighthouse 95+).
* [ ] Users can sign up via Google OAuth and Email.
* [ ] Protected routes correctly bounce unauthenticated users to `/register`.
* [ ] Setup form correctly validates slugs and rejects duplicates.
* [ ] RLS policies prevent users from modifying other users' stores or products.
* [ ] Uploads go directly to R2 (not through the Astro server).
* [ ] Supabase Edge functions correctly trigger the external Python AI script.
* [ ] The `/processing` page successfully listens to `ai_jobs` via Realtime and redirects when status is `done`.
* [ ] The `/preview` route renders generated products securely for the authenticated owner only.
* [ ] **The "Activar mi tienda" button correctly links to the admin frontend.**
