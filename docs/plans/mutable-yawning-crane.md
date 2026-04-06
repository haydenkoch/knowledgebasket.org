# Search UI Overhaul — Raycast-Inspired, Keyboard-First

## Context

The search system has three surfaces (homepage `KbSearch`, public `PublicCommandPalette`, admin `AdminCommandPalette`) that look and behave inconsistently. The homepage dropdown uses custom markup with no ARIA semantics, keyboard nav is incomplete (no Tab), and the input area is cluttered. The `SearchBrowseMenu` two-panel layout is overwhelming. Goal: a unified, Raycast-like experience — clean input, flat scannable results, full keyboard navigation, consistent styling.

## Key Decisions

1. **No search in the navbar.** Search lives only on the homepage (inline) and via Cmd+K modal on other pages.
2. **Homepage Cmd+K focuses the on-page search bar** and opens its dropdown — no separate modal on the homepage.
3. **Other pages Cmd+K** opens a dialog styled identically to the homepage search (same width, same layout).
4. **Shortcut hint** (`⌘K` on Mac, `Ctrl K` on Windows/Linux) is plain grey text inside the right side of the input — no border, no outline, no badge. **Never shown on mobile.**
5. **SearchBrowseMenu replaced** with flat Command.Group rows (scannable, keyboard-navigable).

---

## Phase 1: Foundation — Command Primitive Styling

### `src/lib/components/ui/command/command-item.svelte`

- `aria-selected` highlight: stronger bg contrast, Raycast-style filled row highlight
- Normalize to `rounded-md` (consistent with `--radius`)
- Add `transition-colors duration-75`

### `src/lib/components/ui/command/command-input.svelte`

- Lighter border-bottom separator
- Ensure it works when consumers wrap with custom layout

### `src/lib/components/ui/command/command-group.svelte`

- Tighten heading: `text-[11px] font-semibold tracking-wider uppercase text-muted-foreground`

---

## Phase 2: KbSearch (Homepage) Rewrite

### `src/lib/components/organisms/KbSearch.svelte`

**Input cleanup:**

- Search icon on left + placeholder text
- Right side: subtle grey shortcut hint text (`⌘K` or `Ctrl K`, platform-detected) — no border, no background, no outline. Just `text-xs text-muted-foreground` positioned inside the input. Hidden on mobile via `hidden md:block`.
- Remove: scope badge inside input, submit chevron button, outlined shortcut badge

**Dropdown → Command primitive:**

- Wrap in `Command.Root` for ARIA listbox/option semantics and built-in keyboard nav
- Dropdown renders as floating panel (`absolute z-50`) below the input
- Pre-search (query < 2 chars): flat `Command.Group` sections — scope coil items, popular searches
- Results: `SearchCommandResults` with polished item layout
- Empty/loading: `Command.Empty` / `Command.Loading`
- Footer bar: keyboard hints on left (`↑↓ navigate · ↵ open · esc close`), "View all →" on right. Desktop only.

**Keyboard:**

- Arrow Up/Down: move through items (handled by Command primitive)
- Enter: navigate to selected item, or full search page if none selected
- Escape: close dropdown
- Tab: cycle through scope filters → result list

**Remove:**

- `activeIndex` manual tracking (Command handles selection)
- 140ms blur timeout hack
- Scope badge inside input
- Submit button

**Cmd+K on homepage:**

- `KbSearch` listens for `kb:focus-home-search` event → focuses input, opens dropdown
- Layout dispatches this event instead of `kb:open-global-search` when on homepage

---

## Phase 3: PublicCommandPalette — Match Homepage Style

### `src/lib/components/organisms/PublicCommandPalette.svelte`

- **Only activates on non-homepage pages** (`+layout.svelte` routes Cmd+K differently)
- **Dialog (desktop) / Drawer (mobile)** wrapping the same search content
- **Match homepage width**: `max-w-[720px]` instead of current `max-w-[54rem]`
- **Same input style**: search icon + text + subtle grey shortcut hint (desktop only, no border)
- **Same content**: flat Command.Group pre-search, SearchCommandResults for results, footer bar
- **Remove**: `SearchBrowseMenu` import, scope badge inside input, submit button, outlined shortcut badge

### `src/routes/+layout.svelte`

- Update Cmd+K dispatch logic:
  - `isHome` → dispatch `kb:focus-home-search` (focuses inline search bar)
  - Otherwise → dispatch `kb:open-global-search` (opens command palette modal)
- Mobile bottom search button: same conditional
- PublicCommandPalette stays rendered in layout but only opens on non-home pages

---

## Phase 4: SearchCommandResults Polish

### `src/lib/components/organisms/search/SearchCommandResults.svelte`

- Remove inline "View all results" button at bottom (moved to search surface footer bar)
- Consistent item layout: `icon-box | title + subtitle | badge + chevron`
- Normalize all radius values to `rounded-md`

---

## Phase 5: AdminCommandPalette Alignment

### `src/lib/components/organisms/admin/AdminCommandPalette.svelte`

- Same input cleanup: search icon + text + subtle grey shortcut hint (no border, desktop only)
- Add footer bar with keyboard hints
- Match dialog width to `max-w-[720px]`
- Same item highlight style

---

## Phase 6: Cleanup

- Delete `src/lib/components/organisms/SearchBrowseMenu.svelte`
- Remove dead imports from refactored components

---

## Phase 7: Mobile Polish

- KbSearch dropdown on mobile: inline dropdown or Drawer (test for best feel)
- 44px+ touch targets on all items
- Footer keyboard hints hidden on mobile
- Shortcut hint in input hidden on mobile
- Scope pills: horizontal scroll on narrow screens if needed

---

## Files Modified

| File                                                              | Change                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/lib/components/ui/command/command-item.svelte`               | Highlight style, radius, transition                                  |
| `src/lib/components/ui/command/command-input.svelte`              | Lighter separator                                                    |
| `src/lib/components/ui/command/command-group.svelte`              | Heading style                                                        |
| `src/lib/components/organisms/KbSearch.svelte`                    | Rewrite: Command primitive, clean input, shortcut hint as plain text |
| `src/lib/components/organisms/PublicCommandPalette.svelte`        | Restyle to match homepage, same width, remove browse menu            |
| `src/lib/components/organisms/search/SearchCommandResults.svelte` | Remove inline footer, normalize styles                               |
| `src/lib/components/organisms/admin/AdminCommandPalette.svelte`   | Align with public palette style                                      |
| `src/lib/components/organisms/SearchBrowseMenu.svelte`            | Delete                                                               |
| `src/routes/+layout.svelte`                                       | Conditional Cmd+K dispatch (home vs other pages)                     |

## Files NOT Modified

- `KbHeader.svelte` — already has no search, no changes needed
- `search-client.ts`, `search-constants.ts`, `public-search-presets.ts` — data layer stays the same
- Server files — untouched

## Verification

1. **Homepage Cmd+K**: Press Cmd+K on homepage → input focuses, dropdown opens. Type → results appear. Arrow through, Enter navigates. Escape closes.
2. **Other pages Cmd+K**: Press Cmd+K on `/events` → modal opens with same look as homepage search (720px wide). Same keyboard nav. Escape closes.
3. **Shortcut hint**: Shows `⌘K` on Mac, `Ctrl K` on Windows/Linux. Plain grey text, no border. Not visible on mobile.
4. **No navbar search**: Confirm header has no search input or trigger.
5. **Consistency**: Homepage dropdown and other-page modal visually identical (same width, item layout, footer).
6. **Accessibility**: Screen reader announces listbox, options, group headings. Focus trapped in modal on non-home pages.
7. **Mobile**: Tap search → drawer or inline dropdown. Touch targets 44px+. No keyboard hints or shortcut hints shown.
8. **Admin**: Cmd+K in admin → same clean style, keyboard nav works.
