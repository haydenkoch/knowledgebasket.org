# Coil Detail Page Revamp — Integrated Action Rail + Image-Forward Heroes

## Context

The five public coil detail pages (events, funding, jobs, red-pages, toolbox) currently stack **breadcrumbs + save button above the hero** in a loose flex row. It reads as unfinished scaffolding: the page starts with muted utility chrome before the hero "begins." The user wants that chrome moved **below the hero and integrated** with it, and the hero itself pushed harder on imagery and previews.

This is a presentation-layer revamp only. No schema changes, no data layer changes, no new fields. We're reshaping how existing image/preview fields (`imageUrl`, `imageUrls`, `logoUrl`, toolbox PDF previews) are used and introducing a shared "action rail" organism docked to the bottom of each hero.

## Design direction

**Editorial, image-forward, one bold horizontal band per page.** The hero dominates the top of the viewport. Directly beneath it, a full-width **action rail** with a hairline top border contains the breadcrumb (left) and save + external/share actions (right). The rail visually belongs _to_ the hero — same max-width, tight vertical spacing, no gap — so the save/breadcrumb feel anchored instead of floating pre-content.

Per-coil hero treatments all emphasize existing media:

| Coil          | Hero treatment                                                                                                                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Events**    | Keep cinematic image hero; promote the gallery thumbs into a filmstrip docked inside the hero's bottom-right (remove the standalone gallery row). Action rail absorbs the bookmark/breadcrumb that currently sit above.                                                                             |
| **Jobs**      | Remove the `opacity: 0.35` wash on the image; replace with a proper gradient scrim (`from-black/85 via-black/40 to-transparent`) so imagery actually reads. Keep badges + title overlay.                                                                                                            |
| **Red Pages** | Promote `imageUrl` / `imageUrls[0]` to a real banner image behind the current gradient (gradient becomes the scrim). Logo circle anchors the bottom-left of the hero and visually overlaps the action rail like an avatar. Initials fallback when no logo.                                          |
| **Funding**   | Keep the Flicker→Elderberry gradient (per saved feedback preference), but add a subtle SVG document/grant-paper motif and, when `imageUrl` is present, render it as a framed visual on the right at `md+`.                                                                                          |
| **Toolbox**   | Biggest change: for PDFs, the PDF preview iframe becomes the hero itself (framed, taller, with gradient surround). For non-PDF resources, gradient header + large media-type illustration/icon tile. Move the current "Open PDF in new tab" helper into the action rail as an external-link action. |

No blanket underlines, no Inter/generic fonts (we use the existing theme serif + body stack), no purple-gradient cliché. Reuses existing brand gradients from `src/lib/theme/theme.css`.

## Shared component to add

**`src/lib/components/organisms/CoilDetailActionRail.svelte`** — the one new file.

Props:

```ts
{
  breadcrumb: { href: string; label: string; current: string };
  bookmark: { isBookmarked: boolean; isAuthed: boolean; loginHref: string; saveLabel: string };
  externalActions?: Array<{ href: string; label: string; icon?: Component; variant?: 'default' | 'outline' }>;
}
```

Renders a full-width bar with a hairline top border (`border-t border-border/60`), internal padding (`py-3`), and a flex row: shadcn `Breadcrumb` on the left, actions on the right. Inside, it uses the **same** `<form method="POST" action="?/toggleBookmark">` pattern each page currently duplicates, plus optional external action buttons (share, Google Calendar, Apply, Directions, Open PDF, etc.). No underline on breadcrumb; hover color shift only, per the existing link-styling rule. On mobile, wraps to two rows (breadcrumb, then actions).

This deletes ~20 lines of duplicated breadcrumb+bookmark markup from each of the five `+page.svelte` files.

## Files to modify

All line numbers reference current state from exploration.

1. **Create** `src/lib/components/organisms/CoilDetailActionRail.svelte` (new).

2. **`src/routes/events/[slug]/+page.svelte`**
   - Delete lines 190–211 (breadcrumb + save form above hero).
   - Restructure hero (lines 214–239): dock gallery filmstrip (currently lines 280–294) inside the hero frame, bottom-right. Delete the separate gallery row.
   - Insert `<CoilDetailActionRail />` immediately after the hero `</header>`, before the sticky CTA bar (line 242).
   - Keep the existing sticky CTA bar — it's the "key-facts anchored" strip and should remain below the action rail.
   - Update `.kb-event-hero` CSS: remove `margin-bottom` if any, let the action rail sit flush.

3. **`src/routes/funding/[slug]/+page.svelte`**
   - Delete lines 78–99 (breadcrumb + save above hero).
   - Revise `.kb-funding-hero` (current CSS ~ lines 298–305): add an SVG motif background layer; when `item.imageUrl` is truthy, render a framed image on the right column at `md:grid-cols-[1fr_auto]`.
   - Insert `<CoilDetailActionRail />` directly after the hero `</div>` on line 118.

4. **`src/routes/jobs/[slug]/+page.svelte`**
   - Delete lines 115–136 (breadcrumb + save above hero).
   - Update `.kb-job-hero-img` CSS (~ line 351): drop `opacity: 0.35`; replace with a gradient overlay element already present (lines 354–356) but strengthen it to `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)`.
   - Insert `<CoilDetailActionRail />` directly after the hero `</div>` on line 165.

5. **`src/routes/red-pages/[slug]/+page.svelte`**
   - Delete lines 125–146 (breadcrumb + save above hero).
   - Revise `.kb-rp-hero` (~ lines 334–336): when `item.imageUrl || item.imageUrls?.[0]` exists, render it as a background `<img>` behind the gradient (gradient now acts as scrim); otherwise keep solid gradient.
   - Move the logo/initials circle to `position: absolute; left: 24px; bottom: -32px;` so it overlaps the action rail below.
   - Insert `<CoilDetailActionRail />` directly after the hero `</div>` on line 171, with extra left padding on the breadcrumb row to clear the overlapping logo.

6. **`src/routes/toolbox/[slug]/+page.svelte`**
   - Delete lines 78–99 (breadcrumb + save above header).
   - Replace the plain `<header>` at lines 101–131 with a true hero block:
     - If `hasPdfPreview && previewUrl`: promote the iframe (currently at lines 133–150) _into_ the hero slot, framed with gradient surround + title overlay above the iframe; delete the standalone preview section.
     - Otherwise: gradient header (new colors picked from theme, e.g. Lakebed → Elderberry) with a large media-type badge tile.
   - Insert `<CoilDetailActionRail />` immediately after the new hero. Move the "Open PDF in new tab" affordance into the rail's `externalActions`.

## Reusing what already exists

- **Breadcrumb**: shadcn `Breadcrumb` from `$lib/components/ui/breadcrumb` — already imported in all five pages, already compliant with the link-styling rule. Action rail wraps it, doesn't replace it.
- **Button**: shadcn `Button` from `$lib/components/ui/button` — used for save + external actions.
- **Bookmark toggle**: each page already has the `?/toggleBookmark` form action wired via `src/lib/server/personalization.ts`. The rail just renders the existing form; no server changes.
- **Placeholder images**: `getPlaceholderImageSrcset` / `DEFAULT_SIZES_HERO` from `$lib/data/placeholders` — already used by events, reuse for jobs/red-pages fallbacks.
- **`SourceProvenanceCard`**: untouched, still rendered in body content of each page.
- **Brand gradient tokens**: already defined in `src/lib/theme/theme.css`; reuse existing `--color-flicker-*`, `--color-elderberry-*`, `--color-red-*`, `--color-lakebed-*` custom properties.

## Non-goals

- No schema migrations, no new image fields, no new upload flows.
- No changes to admin forms or the data layer (`src/lib/server/{events,funding,jobs,red-pages,toolbox}.ts`).
- No sidebar field changes — only the top-of-page hero + action rail region.
- Not adding related-items modules or map embeds (tracked separately in project memory).
- Not touching mobile filter flows, search, or nav.

## Verification

After implementation, verify end-to-end:

1. `pnpm dev` and visit one seeded item per coil:
   - `/events/<slug>` — hero image dominant, gallery filmstrip inside hero, action rail directly below with breadcrumb + Save + (Register / Directions / Add to Calendar) actions, sticky CTA bar still works.
   - `/funding/<slug>` — gradient hero with SVG motif (and right-side image if `imageUrl` present), action rail below with Save + Apply externally.
   - `/jobs/<slug>` — hero image reads clearly (no 35% wash), action rail below with Save + Apply.
   - `/red-pages/<slug>` — banner image behind gradient scrim when available, logo circle overlapping action rail, rail offset for the overlap.
   - `/toolbox/<slug>` with a PDF — PDF iframe _is_ the hero, standalone preview section gone, rail has "Open PDF in new tab" action.
   - `/toolbox/<slug>` without a PDF — gradient header fallback.
2. Responsive check at 375px, 768px, 1280px — action rail wraps to two rows on mobile, breadcrumb doesn't overflow.
3. Signed-out → signed-in state: "Sign in to save" → "Save <thing>" → "Saved to account" transitions work (form action unchanged).
4. Breadcrumb links still obey the no-underline-until-hover rule (global CSS + shadcn component).
5. `pnpm check` (svelte-check) and `pnpm lint` pass. No a11y regressions on the hero `<img alt="">` (decorative) vs the logo `<img>` (should keep descriptive alt).
6. OG image metadata unchanged — existing `imageUrl`-based OG tags still render.

## Open questions resolved inline

- **Keep gradient headers on funding/red-pages/toolbox?** Yes — per saved user preference (`feedback_detail_page_approach.md`).
- **Surface every field or high-value only?** High-value only; this revamp doesn't touch sidebar fields at all, only the hero + rail region.
- **New dependencies?** None.
