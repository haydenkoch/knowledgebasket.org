# Knowledge Basket design system

## Atomic design

- **Atoms** — `site/src/lib/components/ui/` (shadcn-svelte / bits-ui primitives: Button, Input, Tabs, Popover, Command, Badge, Calendar, etc.). Themed via `site/src/lib/theme/theme.css` and Tailwind.
- **Molecules** — `site/src/lib/components/molecules/`: small composites (e.g. EventCard, EventListItem, EventsToolbar).
- **Organisms** — `site/src/lib/components/organisms/`: section-level blocks (KbHero, KbHeader, KbSearch, KbTwoColumnLayout, KbFilterSection, EventsViewTabs, EventsFilterBar, EventsDateRangeFilter, EventsSidebar, EventsCalendarView, EventsRightSidebar, CaliforniaMap).
- **Pages** — Route-level composition in `site/src/routes/`; they import from molecules and organisms and own page state.

## Success metric: events filter bar

The **events filter bar** (Cost / Region / Type popovers + “Clear filters & search”) is the reference for structure and quality:

- Built from shadcn atoms: Popover, Button, Command, Badge, CheckIcon, ChevronDownIcon.
- Clear props: filter state and counts passed in; callbacks for changes and clear.
- Styles co-located in the organism (EventsFilterBar) where possible; portaled popover content still uses global `.kb-filter-*` in `lib/styles/kb/refine.css` for dropdowns that render outside the component tree.

New organisms and molecules should match this level: small, composed from atoms, clear props, Tailwind + theme vars + minimal scoped or local CSS.

## Styling

- **Theme** — Single source: `site/src/lib/theme/theme.css` (brand palettes, semantic tokens, `--color-kb-*`). Tailwind and layout use `site/src/routes/layout.css` with `@theme inline` mapping to these vars.
- **Global KB styles** — Split by feature under `site/src/lib/styles/kb/`: hero, layout, refine, toolbar-cards, home, date-range, header, rest. Entrypoint: `site/src/lib/styles/kb.css` (imports all). Prefer moving styles into components over adding new global `.kb-*` rules.
- **New components** — Use Tailwind + theme vars; avoid introducing new global `.kb-*` classes. Prefer component-scoped `<style>` or local CSS.

## Tokens

Use semantic tokens from theme.css (e.g. `--primary`, `--background`, `--foreground`, `--muted-foreground`, `--border`, `--radius`) and brand aliases (`--color-lakebed-*`, `--color-pinyon-*`, etc.) rather than hard-coded colors or spacing in new code.

---

## Improvements and refinements (best practices)

Use this as a roadmap to tighten the codebase further.

### 1. Thin the events page (~986 → ~300–400 lines)

- **Move state and derived logic into a composable** — e.g. `useEventsFilters(events)` in `$lib/hooks/use-events-filters.ts` (or similar) that returns `searchQuery`, `regionSelect`, `typeSelect`, `costFilter`, `rangeStart`, `rangeEnd`, all derived (`filtered`, `filteredTotal`, `dateBuckets`, `costCountsInRange`, etc.), and handlers (`toggleMulti`, `clearFilters`, `handleSliderChange`, …). The page then only composes layout and passes the composable’s return value into organisms. This keeps the page as “composition + one hook” and makes filter logic reusable and testable.
- **Extract Schedule-X setup** — Move `eventToSx`, `createCalendar` usage, and the `$effect` that syncs `filtered` into the calendar into a small module or a wrapper (e.g. `useScheduleXCalendar(filtered, …)`) so the page script is shorter and focused on layout.

### 2. Remove duplicate and dead styles

- **Drop global rules that components now own** — `EventCard`, `EventListItem`, and `EventsToolbar` each have their own `<style>` blocks. Remove the corresponding rules from `kb/toolbar-cards.css` (e.g. `.kb-toolbar`, `.kb-rcount`, `.kb-card`, `.kb-cimg`, …) for **events usage only** if no other route (e.g. funding, red-pages) uses those classes for the same layout. If other coils share the same card/toolbar look, keep one source (either global or a shared molecule) and have events use it.
- **Audit unused imports on the events page** — After extraction, remove any imports that are only used inside `EventsFilterBar`, `EventsDateRangeFilter`, etc. (e.g. `CheckIcon`, `Command`, `Popover`, `Button`, `Slider` may be unused on the page if all usage is in organisms).

### 3. Tailwind-first in components

- **Prefer utilities over custom classes** — In new or refactored components, use Tailwind + theme (e.g. `rounded-lg`, `bg-card`, `text-muted-foreground`, `border-border`) instead of new `.kb-*` or long custom `<style>` blocks. Reserve custom CSS for layout or behavior that Tailwind doesn’t cover (e.g. line-clamp, specific grid).
- **Align with theme** — Use `@theme` / theme.css tokens in Tailwind (e.g. `var(--radius)`, `var(--teal)`) so components stay consistent and dark mode (if added later) is easier.

### 4. Themed shadcn wrappers (optional)

- **Thin “Kb” atom layer** — If the same variant/class is repeated across many pages (e.g. primary button, card style), add wrappers like `KbButton`, `KbCard`, or `KbBadge` in `components/ui/` or `components/atoms/` that render the shadcn primitive with fixed `variant`/`class`. Then use these in organisms so changing “all primary buttons” is one place. Only add where it reduces real duplication.

### 5. Split and name global CSS more clearly

- **Break up `rest.css`** — It still holds many features (red pages, events calendar, forms, list, pagination, etc.). Split into e.g. `redpages.css`, `events-calendar.css`, `events-forms.css`, `events-list.css`, `pagination.css`, and import from `kb.css`. Same class names; easier to find and co-locate later.
- **Naming** — Keep `.kb-*` for legacy; new components should avoid adding new global `.kb-*` and use Tailwind + scoped/local CSS.

### 6. Single source of truth for types

- **Event types** — Ensure `EventItem` and event-related types live in one place (e.g. `$lib/data/kb.ts` or `$lib/types/events.ts`) and are imported by events page, EventCard, EventListItem, EventsFilterBar, etc. Avoid redefining shapes in multiple components.

### 7. Accessibility and consistency

- **Filter bar as reference** — New list/filter UIs should follow the same pattern: clear `aria-label`, `role="group"` where appropriate, keyboard-friendly Command/Popover, and visible focus states.
- **Drawer and modals** — Ensure focus is trapped and restored when opening/closing the mobile event drawer and any other modals.

### 8. Documentation and checklist

- **When to use molecule vs organism** — In DESIGN_SYSTEM or a short CONTRIBUTING: “Molecule = small, reusable composite (e.g. one card, one list row). Organism = section of the page (sidebar, filter bar, calendar view).”
- **New component checklist** — Props interface, Tailwind-first, no new global `.kb-*`, uses theme tokens, and (for organisms) composed from atoms/molecules.

### 9. Testing (optional but recommended)

- **Filter and date logic** — Unit test `toggleMulti`, date range normalization, and derived counts (e.g. `costCountsInRange`) in `$lib/utils/format.ts` or the composable.
- **Components** — Light component tests (e.g. EventCard with mock event, EventsFilterBar with mock props) to guard against regressions.

Implementing these in order (1 → 2 → 3, then 4–9 as needed) will bring the project closer to the “filter bar” standard everywhere and keep the codebase maintainable as it grows.
