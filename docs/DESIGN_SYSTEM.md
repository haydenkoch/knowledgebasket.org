# Knowledge Basket design system

## Atomic design

- **Atoms** — `site/src/lib/components/ui/` (shadcn-svelte / bits-ui primitives: Button, Input, Tabs, Popover, Command, Badge, Calendar, etc.). Themed via `site/src/lib/theme/theme.css` and Tailwind. Do not edit these files manually — managed by the shadcn-svelte CLI.
- **Molecules** — `site/src/lib/components/molecules/`: small composites used within organisms or pages.
  - `EventCard.svelte` — grid card for an event (image, title, date, location, CTA)
  - `EventListItem.svelte` — horizontal list row for an event
  - `EventsToolbar.svelte` — count display above an event list
  - `RichTextEditor.svelte` — TinyMCE wrapper for HTML description editing
- **Organisms** — `site/src/lib/components/organisms/`: section-level composites.
  - `CoilTheme.svelte` — sets `data-coil` attribute for per-coil CSS variable overrides
  - `EventsCalendarView.svelte` — Schedule-X calendar wrapper with event rendering
  - `EventsRightSidebar.svelte` — upcoming events sidebar for event detail pages
  - `EventsSidebar.svelte` — search + filter sidebar for the events list page
  - `KbFilterSection.svelte` — reusable filter checklist section (title + option list)
  - `KbHeader.svelte` — site header with nav and mobile menu
  - `KbHero.svelte` — coil hero banner (gradient bg, eyebrow, title, stats, weave pattern)
  - `KbSearch.svelte` — global search input with Meilisearch integration
  - `KbTwoColumnLayout.svelte` — sidebar + main content two-column layout
  - `admin/EventForm.svelte` — full event create/edit form for the admin area
  - `admin/StatusBadge.svelte` — coloured status pill (published / pending / draft / rejected)
- **Pages** — Route-level composition in `site/src/routes/`; they import from molecules and organisms and own page-level state.

## Styling

- **Tailwind only** — no new CSS files. All component styles use Tailwind utility classes directly on elements.
- **Theme** — Single source: `site/src/lib/theme/theme.css` (brand palettes, semantic tokens, and `--color-kb-*` aliases). Tailwind maps to these via `@theme inline` in `site/src/routes/layout.css`.
- **Scoped `<style>` blocks** — allowed for third-party library overrides (Schedule-X calendar, TinyMCE) that require targeting generated class names outside the component tree. Use `:global()` when the class is passed as a prop to a child Svelte component.
- **No new global CSS files** — `site/src/lib/styles/kb.css` and `site/src/lib/styles/kb/` were deleted; all styles are either Tailwind utilities or scoped `<style>` blocks.

## Tokens

Use semantic tokens from `theme.css` in preference to raw palette values:

| Purpose | Token |
|---------|-------|
| Page background | `var(--background)` |
| Default text | `var(--foreground)` |
| Muted text | `var(--muted-foreground)` |
| Card / panel bg | `var(--card)` |
| Subtle divider | `var(--rule)` |
| Border | `var(--border)` |
| Brand primary | `var(--primary)` |
| Teal action | `var(--teal)` |
| Red / alert | `var(--red)` |
| Gold | `var(--gold)` |
| Forest green | `var(--forest)` |
| Border radius | `var(--radius)` |
| Card shadow | `var(--sh)` |
| Hover shadow | `var(--shh)` |

Brand aliases (`--color-kb-teal`, `--color-kb-navy`, etc.) are also available and resolve to the same values — use either form.

## New component checklist

Before adding a new component:

1. Can a shadcn-svelte primitive from `ui/` do it instead? Check `$lib/components/ui/` first.
2. Is it reused in more than one place? If not, keep the markup inline in the route.
3. **Molecule or organism?** Molecule = small, single-purpose composite (one card, one row). Organism = section of a page (sidebar, hero, filter bar).
4. Use `$props()`, `$derived`, `$state` — no `export let`, `$:`, or stores unless global shared state is truly needed.
5. Tailwind utilities first. Scoped `<style>` only for third-party library overrides.
6. No new global `.kb-*` class names.

## Per-coil theming

`CoilTheme.svelte` wraps pages in `<div data-coil="{coil}">`. CSS variable overrides in `theme.css` under `[data-coil="events"]` etc. allow per-coil colour adjustments without duplicating component styles.

## Admin components

Admin-only components live in `organisms/admin/` and are only imported by routes under `routes/admin/`. They are full organisms (forms, badges) rather than atoms, so they belong in the organism layer rather than a flat `admin/` directory.
