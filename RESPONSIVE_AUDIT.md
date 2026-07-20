# MiTienda Onboarding — Responsive/UX Audit

Scope: `/`, `/register`, `/setup`, `/upload`, `/processing`, `/preview/:storeId`.
Breakpoints tested live: ~390px (mobile), ~1440px (desktop). Tablet (~768px)
was reasoned about from the grid/flex rules in code where not screenshotted
directly, since the underlying Tailwind/CSS mechanisms (`auto-fit`,
`minmax()`, `md:grid-cols-3`) are the same mechanisms verified at the two
tested widths.

Method: ran the app locally (`npm install` + Node 22 via nvm — the repo's
committed Node 20 environment can't run Astro 6), and viewed each page in a
real browser at both widths. `/register`, `/setup`, `/upload` needed a
Supabase client that doesn't throw (env was empty), and `/setup`, `/upload`,
`/processing`, `/preview` are gated by `middleware.ts` requiring a real
session. Both were bypassed **temporarily and locally only** (placeholder
`.env` values, a `PUBLIC_DEV_SKIP_AUTH_QA` middleware flag) to view the
pages, then fully reverted — `git diff` now touches only the three files
listed below. `/processing` and `/preview` additionally run their own
server-side Supabase queries beyond the middleware, so for those two I
built temporary standalone harness pages that rendered `AIProcessingStatus`
and `StorePreview` directly with mock props, viewed them, then deleted the
harness files. No Island prop/state/API shape was changed anywhere.

---

## `/` (landing)

Already responsive by design — `sm:`/`lg:` type-scale prefixes, `md:grid-cols-3`
for the "how it works" steps (correctly collapses to one column on mobile).
No bugs found at either breakpoint. **No changes made.**

## `/register`

Card is `max-w-md`, centered, responsive padding (`p-6 sm:p-8`). Clean at
both breakpoints — this narrow-centered-card pattern is the expected one for
a linear signup form, not a bug to "fix into" a multi-column layout.
**No changes made.**

Open item (not fixed, flagging per your step-5 instruction to pause on
anything beyond classes/layout): the page mixes languages — Spanish chrome
("Crea tu cuenta" / "Registro") wrapping an English form ("Sign up",
"Username", "Create Account"). This is copy content, not layout, so I didn't
touch it, but it's the most visible inconsistency in the whole flow.

## `/setup`

**Before:** card was `max-w-xl` with flat `p-8` padding and an extra `mt-8`,
diverging from `/register`'s `max-w-md` / `p-6 sm:p-8` for no content-driven
reason — the onboarding steps grew wider arbitrarily as the user progressed
(448px → 576px → 672px).

**After:** `src/pages/setup.astro` — aligned to `max-w-md` + `p-6 sm:p-8`,
dropped the redundant `mt-8` (the layout's own spacing already handles it).
Verified at both breakpoints: the slug-input row (icon + input +
"mitienda.com/" suffix) still fits comfortably at the narrower width.

## `/upload`

**Before:** same divergence — `max-w-2xl` with flat `p-8` and an extra `mt-8`.

**After:** `src/pages/upload.astro` — kept `max-w-2xl` (justified: the
dropzone + selected-file-list content genuinely benefits from more width),
but normalized padding to `p-6 sm:p-8` and dropped `mt-8` to match the other
two steps' spacing rhythm. Verified at both breakpoints.

## `/processing`

`AIProcessingStatus` is Tailwind-only (`max-w-sm`/`max-w-xs`, centered flex
column) and was already correct at both breakpoints — the generous desktop
whitespace around a narrow, centered loading state is appropriate for this
kind of screen, not a bug. **No changes made.**

Same open language-mixing item as `/register` (English copy: "Analyzing
images...", "Catalog ready!").

## `/preview/:storeId`

This is where the real bugs were. `StorePreview.tsx` (and its inline
`ImageEditorModal`, defined in the same file — see naming note below) is
built entirely with inline `style={{}}` objects and hardcoded pixel values,
with no responsive rules at all, unlike every other page in the flow.

**Bugs found (mobile, confirmed via screenshot) and fixed in
`src/components/islands/StorePreview.tsx`:**

1. **Categories grid always forced `min(categories.length, 3)` columns.**
   With 3 categories this meant 3 cramped columns even on a 375–390px
   screen: squished 16:9 thumbnails, overlapping label text. *Fix:* switched
   to `gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'` — the
   same pattern the Products grid a few lines below already uses correctly.
   Now renders 2 columns on mobile, 3 on desktop, and correctly handles 1–2
   categories without leaving empty forced columns.

2. **Hero mini-gallery (4 fixed 110×74px images) overflowed narrow
   viewports.** At a true 360–375px phone width the 4 images + gaps (≈470px)
   don't fit inside the available content width (≈310–330px after padding);
   they'd get clipped by the section's `overflow:hidden`. *Fix:* image width
   is now `clamp(56px, 18vw, 110px)` with `aspectRatio: '110/74'` — scales
   down smoothly on narrow screens and is pixel-identical to the original at
   desktop widths (clamps at 110px).

3. **Crop modal's primary "Guardar recorte" button** used `marginLeft:
   'auto'` inside a `flexWrap: 'wrap'` row of 4 buttons. On mobile widths the
   row wraps and the primary action ends up stranded alone, flush-right, on
   its own line — visually disconnected from Rotate/Reset/Cancel. *Fix:*
   restructured so the 3 secondary controls form one wrapping row and
   "Guardar recorte" is a full-width primary action below them. This isn't
   just a mobile patch — it reads as a more intentional design at every
   width (confirmed at both breakpoints), not only a fix for the wrap case.

4. **Touch targets under 44px:** the header's theme-picker and cart
   `IconButton`s were 36×36, and the per-product "edit image" pencil button
   was 32×32. *Fix:* both bumped to 44×44 (adjusted the theme-picker
   dropdown's offset from `top: 44` to `top: 52` to match the taller
   button).

**Not fixed / flagged only:**
- The crop modal's own close (✕) button is 30×30. Bumping it to 44px would
  require growing the modal header's padding too (currently a tight
  `14px 18px`), which starts cascading into more of that component than a
  single-property class change — flagging per your step-5 "pause and flag"
  guidance rather than guessing at the right header redesign.
- Same English/Spanish copy-mixing pattern as elsewhere (`"Términos y
  Condiciones"` next to a store name island that's otherwise fully Spanish —
  less of an issue here since the whole component is closer to one voice).

**Naming note (not a bug, just worth knowing):** `src/components/islands/
ImageEditorModal.tsx` is not the crop/zoom/rotate modal used on this page —
it's actually `ProductCatalogIsland`, the product-card interaction layer for
the **public storefront** (`src/pages/[store_slug]/index.astro`), which is
outside this audit's scope (`/`→`/preview` only). The real crop/rotate
modal for `/preview` is a same-named `ImageEditorModal` function defined
*inline inside* `StorePreview.tsx`. Worth a rename at some point so the
filename matches its contents, but that's a refactor decision, not a
layout fix, so I left it alone.

---

## Cross-flow consistency (step 6)

Walked the full flow at both breakpoints after the fixes:
- Progress bar / step chrome (`OnboardingLayout`) is identical across all
  steps — no issues there.
- Card width now follows a coherent progression: `register` and `setup`
  (simple stacked forms) share `max-w-md`; `upload` is `max-w-2xl` because
  its content (dropzone + file list) genuinely needs more room. All three
  share the same `p-6 sm:p-8` padding rhythm.
- `/preview` intentionally breaks from the `max-w-3xl` onboarding shell
  (it's `max-w-1200px` inline, a full storefront layout, not a form step) —
  that's correct, not an inconsistency.

## Explicitly out of scope / untouched

- `[store_slug]/index.astro` (public storefront) — not in the audited route
  list.
- Any Island prop, state, event handler, or Supabase/R2/OpenRouter call —
  confirmed via diff review, only `className`/inline-`style` values changed.
- Copy/language consistency (Spanish vs. English across islands) — a
  content decision, flagged above wherever found, not silently rewritten.

## Files changed

- `src/components/islands/StorePreview.tsx`
- `src/pages/setup.astro`
- `src/pages/upload.astro`

No other files differ from the base branch — the temporary `.env`,
`middleware.ts` bypass, and two `qa-harness-*.astro` files used only to view
gated pages during this audit have all been removed/reverted.
