# Plan — Toolbox PDF Viewer fixes

## Context

The custom PDF viewer in the toolbox (`ToolboxPdfViewer.svelte`, used on `/toolbox/[slug]`) has two visible defects:

1. **Main page overflows its container to the right and gets clipped.** The paper sizing currently depends on `width: calc(100% * var(--pdf-zoom, 1))` combined with `min-width: 100%` and an inline `aspect-ratio`. This is fragile: `pageAspect` is only updated after the first successful render, and the combination of a flex-column stage, stretchy replaced element (canvas), and async resize means the paper can briefly exceed the stage's content box — especially when the layout is re-measured during scroll-container or grid transitions.
2. **Page preview list spacing is inconsistent across PDFs.** The thumbnail rail has `flex: 1 1 0` and inherits grid defaults (`align-content: normal`, `justify-content: normal`), so its height is driven by the main stage's rendered height (which varies with the PDF's aspect ratio and viewport width). With few pages the thumbs cluster at the top with dead space below; with many pages the rail overflows. On mobile the horizontal strip inherits the same grid defaults so items cram to the left when the list is narrower than the panel.

The fix should make both the paper and the thumb rail deterministic: one explicit sizing source of truth, locked item dimensions, and predictable overflow behaviour regardless of page count or PDF aspect ratio.

Only one file is touched:

- `site/src/lib/components/toolbox/ToolboxPdfViewer.svelte`

## Changes

### 1. Deterministic paper sizing (fix overflow)

Replace the CSS-percentage + aspect-ratio approach with explicit pixel dimensions driven from JS.

**Script changes** (`ToolboxPdfViewer.svelte`, ~lines 38–93, 277–342):

- Add two state values alongside `viewportWidth`:
  ```ts
  let paperWidth = $state(0);
  let paperHeight = $state(0);
  ```
- In `updateViewportWidth()`, read `pageViewport.clientWidth` and subtract the stage's horizontal padding (currently `1rem` per side → `32px`; `0.75rem` per side → `24px` below 760px). Store the resulting "available width" in `viewportWidth`. This keeps the JS math consistent with what CSS actually gives the paper.
- In `renderPage()` (currently line 301), after `pageAspect = baseViewport.width / baseViewport.height`:
  ```ts
  const fitWidth = Math.max(width, 220);
  const effectivePaperWidth = Math.round(fitWidth * multiplier);
  const effectivePaperHeight = Math.round(effectivePaperWidth / pageAspect);
  paperWidth = effectivePaperWidth;
  paperHeight = effectivePaperHeight;
  ```
  (Raster scale math stays the same — it already uses `baseViewport.width` and the same multiplier. Nothing changes about rasterization quality.)
- On `loadDocument()` reset: clear `paperWidth = 0; paperHeight = 0;` alongside the existing `zoomMultiplier = 1;`.

**Markup change** (line 628):

```svelte
<div class="kb-pdf__paper" style="width: {paperWidth}px; height: {paperHeight}px;">
	<canvas bind:this={canvas} class="kb-pdf__canvas"></canvas>
</div>
```

Drop `--pdf-zoom` and the inline `aspect-ratio`; they become redundant.

**CSS change** (`.kb-pdf__paper`, lines 840–852):

```css
.kb-pdf__paper {
	display: block;
	max-width: 100%; /* safety clamp at zoom = 1 */
	align-self: center;
	background: #fff;
	border: 1px solid var(--border);
	box-shadow:
		0 1px 2px rgba(15, 23, 42, 0.04),
		0 8px 24px -8px rgba(15, 23, 42, 0.12);
}
```

Remove `width: calc(...)`, `min-width: 100%`, `max-width: none`, and `aspect-ratio`. Keep `.kb-pdf__canvas { width: 100% !important; height: 100% !important; }` — canvas continues to fill the explicitly-sized paper.

Why this fixes the overflow: at zoom = 1 the paper is exactly `fitWidth` (stage content width minus padding), so there is no rounding error or race that can push it past the scroll container. At zoom > 1, the scroll container (`.kb-pdf__stage-scroll`) legitimately scrolls horizontally — which is what the user expects when they've zoomed in.

### 2. Deterministic thumbnail rail (fix spacing inconsistency)

Lock the rail's layout so page count and PDF aspect ratio no longer influence thumbnail size or distribution.

**Layout constraint** — the rail's height must be decoupled from the main stage's height. Add a bounded height to `.kb-pdf__layout` on desktop so both columns share a predictable shell:

```css
@media (min-width: 980px) {
	.kb-pdf__layout.has-thumbs {
		grid-template-columns: minmax(0, 1fr) 180px;
		max-height: min(80vh, 900px);
	}
	.kb-pdf__stage-scroll {
		min-height: 0; /* allow grid row to shrink */
	}
}
```

(Widening the sidebar from 168px → 180px gives the thumbnails breathing room for consistent padding; adjust down if it feels too wide in review.)

**Thumb panel / list** (lines 864–906): explicitly set alignment and lock item sizing.

```css
.kb-pdf__thumb-panel {
	border-top: 1px solid var(--border);
	background: var(--card);
	min-width: 0;
	min-height: 0;
}

@media (min-width: 980px) {
	.kb-pdf__thumb-panel {
		border-top: 0;
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
}

/* Mobile: horizontal strip, always starts flush left, consistent item size. */
.kb-pdf__thumb-list {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 104px;
	justify-content: start;
	align-content: start;
	gap: 0.75rem;
	padding: 0.75rem;
	overflow-x: auto;
	overflow-y: hidden;
	max-width: 100%;
	min-width: 0;
	scrollbar-width: thin;
}

@media (min-width: 980px) {
	.kb-pdf__thumb-list {
		grid-auto-flow: row;
		grid-auto-columns: initial;
		grid-template-columns: 1fr;
		justify-content: stretch;
		align-content: start; /* never distribute vertical space across rows */
		gap: 0.75rem;
		overflow-x: visible;
		overflow-y: auto;
		flex: 1 1 0;
		min-height: 0;
		max-width: none;
	}
}
```

Key properties added:

- `align-content: start` on both orientations — rows never stretch to fill extra space, so 2 pages and 200 pages render with identical row metrics.
- `justify-content: start` (mobile) / `stretch` (desktop) — explicit rather than relying on grid's `normal` default.
- Consistent `gap: 0.75rem` in both orientations (was `0.625rem`).
- `min-height: 0` on both the panel and the layout's stage-scroll so the bounded-height grid row actually lets children scroll.

### 3. Minor: reflect the new stage-padding constant

The JS `fitWidth` subtraction currently hardcodes `-16`. Once `updateViewportWidth()` subtracts the real padding (see §1), change `renderPage()`'s `const fitWidth = Math.max(width - 16, 220)` → `const fitWidth = Math.max(width, 220)` so padding isn't subtracted twice.

## Files modified

- `site/src/lib/components/toolbox/ToolboxPdfViewer.svelte` — script (state + `updateViewportWidth` + `renderPage` + `loadDocument` reset), markup (paper inline style), `<style>` (`.kb-pdf__paper`, `.kb-pdf__layout`, `.kb-pdf__stage-scroll`, `.kb-pdf__thumb-panel`, `.kb-pdf__thumb-list`).

No other files need changes. The preview proxy route, `pdfjs.ts`, and the parent `/toolbox/[slug]/+page.svelte` all stay the same.

## Verification

1. `pnpm dev`, open a toolbox item with a PDF preview (e.g. any slug with `hasPdfPreview`).
2. **Overflow test:**
   - Resize the window down to ~400px wide. The paper should always sit flush inside the card, never clipped on the right.
   - Zoom in (zoom > 100%). The stage-scroll container should scroll horizontally; the paper stays centered at zoom = 1 and left-anchored under scroll at zoom > 1.
   - Try PDFs with portrait, landscape, and unusual aspect ratios — confirm none overflow at zoom = 1.
3. **Thumb spacing test:**
   - Open a 1-page PDF, a 5-page PDF, and a 50-page PDF (the import-candidates pipeline usually has samples of each; otherwise any ingested toolbox item will do).
   - Desktop: thumbnails should be identical in width/height/gap across all three. With 1–5 pages there's empty space at the bottom of the rail (expected); with 50 pages the rail scrolls vertically with the same per-item metrics.
   - Mobile (<980px): thumbnails should be a flush-left horizontal strip with identical gaps in all three cases.
4. `pnpm check` — no new TS errors from the added `$state` values.
5. `pnpm lint` — confirm the Svelte file is clean.
