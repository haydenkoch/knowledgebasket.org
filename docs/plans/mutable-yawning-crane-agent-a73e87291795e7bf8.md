# Search UI Overhaul — Raycast-Inspired, Unified, Keyboard-First

## Goal

Consolidate the three search surfaces (KbSearch homepage bar, PublicCommandPalette Cmd+K, AdminCommandPalette) into a unified, Raycast-inspired experience with consistent visuals, full keyboard navigation, proper ARIA semantics, and responsive mobile support.

---

## Architecture Decision: Unify KbSearch Into the Command Primitive

**Current problem:** `KbSearch.svelte` has a completely custom dropdown with manual keyboard handling, no ARIA `listbox`/`option` roles, and looks different from the Command palette. The two systems have duplicated search logic.

**Decision:** Rewrite `KbSearch.svelte`'s dropdown to use a **floating `Command.Root`** panel (not inside a Dialog/Drawer) that appears below the homepage input on focus/type. This gives KbSearch the same keyboard nav, ARIA semantics, and item rendering as the palette — without wrapping it in a modal.

The homepage input remains a visible, always-rendered search bar. When focused and results appear, a positioned panel opens beneath it using the `Command.Root` + `Command.List` + `Command.Item` primitives. This is the same pattern Raycast uses: input is always visible, results panel floats below.

---

## Phase 1: Establish Shared Styling Tokens & Result Item Component

### 1A. Normalize border-radius across all search UI

**Files to modify:**

- `src/lib/components/ui/command/command-item.svelte`
- `src/lib/components/ui/command/command-link-item.svelte`
- `src/lib/components/organisms/search/SearchCommandResults.svelte`

**Changes:**

- Replace all hardcoded radius values (`rounded-xl`, `rounded-[0.45rem]`, `rounded-[0.3rem]`, `rounded-[0.65rem]`, `rounded-[0.85rem]`) with the shadcn `--radius` token system: `rounded-[var(--radius-sm)]`, `rounded-[var(--radius-md)]`, `rounded-[var(--radius-lg)]`
- The base `command-item.svelte` already uses `rounded-sm` from shadcn defaults. Override the item class in consumer components to use `rounded-[var(--radius-md)]` for the Raycast highlight-bar feel
- Mapping: result items = `radius-md`, panels/containers = `radius-lg`, small badges/pills = `radius-sm`

### 1B. Unified selected-item highlight style (Raycast "bar")

**File to modify:** `src/lib/components/organisms/search/SearchCommandResults.svelte`

**Changes:**

- Replace `aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)]` with a cleaner, more visible highlight:
  ```
  aria-selected:bg-accent/10 aria-selected:text-accent-foreground
  ```
  Or use a dedicated class like: `aria-selected:bg-[var(--color-lakebed-950)]/[0.07] aria-selected:shadow-[inset_0_0_0_1px_var(--border)]`
- The key Raycast feel is a **subtle background fill with a very faint border/shadow** on the selected row, plus a slight left-border accent or the entire row having a smooth rounded highlight. Implement with:
  ```css
  [data-slot='command-item'][aria-selected='true'] {
  	background: color-mix(in srgb, var(--accent) 8%, var(--background));
  	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent);
  }
  ```
- Apply this consistently in `command-item.svelte` base styles so both KbSearch and palettes inherit it

### 1C. Clean up SearchCommandResults item layout

**File:** `src/lib/components/organisms/search/SearchCommandResults.svelte`

**Current:** Icon box (`h-9 w-9`) + title/subtitle stacked + badge + chevron
**Target Raycast layout:** Same but tighter:

- Icon box: `h-8 w-8 rounded-[var(--radius-md)]` (slightly smaller)
- Title: `text-sm font-medium` (not bold/semibold — Raycast uses medium weight)
- Subtitle: `text-xs text-muted-foreground truncate`
- Right side: badge pill + `Command.Shortcut` for keyboard hint on hover/selected
- Item padding: `px-2 py-2` (Raycast is compact, not `py-3`)

---

## Phase 2: Rewrite KbSearch to Use Command Primitive

### 2A. Restructure `KbSearch.svelte` template

**File:** `src/lib/components/organisms/KbSearch.svelte`

**Major changes:**

1. **Input area cleanup (Raycast-clean input):**
   - Remove the scope badge from inside the input (`<span>` with Sparkles icon at `left-10`)
   - Remove the shortcut hint overlay (`⌘K` badge at `right-12`)
   - Remove the submit button from inside the input
   - The input becomes: `SearchIcon` on the left + clean text input + nothing else
   - Below the input (outside the input container), add a row of **scope filter chips**: small pill buttons for "All", "Events", "Funding", "Red Pages", "Jobs", "Toolbox". The active chip gets `bg-primary text-primary-foreground`, inactive gets `bg-muted text-muted-foreground`
   - The shortcut hint (`⌘K`) and submit arrow move to a **footer bar** inside the results panel

2. **Results panel uses Command primitives:**
   - Wrap the entire dropdown in `Command.Root` with `shouldFilter={false}` (we do server-side filtering)
   - The input becomes a hidden `Command.Input` that syncs value with the visible homepage input (or use `Command.Input` directly as the visible input and style it)
   - Results render as `Command.Group` + `Command.Item` / `Command.LinkItem`
   - Loading state uses `Command.Loading`
   - Empty state uses `Command.Empty`
   - The "View all results" becomes the last `Command.Item` in the list (so arrow keys can reach it)

3. **Footer bar (Raycast-style):**
   - A `border-t` bar at the bottom of the results panel
   - Left: keyboard hints — `↑↓ Navigate` · `↵ Open` · `⎋ Close`
   - Right: "View all results →" button (when query is long enough)
   - This replaces the current "View all results" link that's part of the result list

4. **Remove the blur timeout hack:**
   - The 140ms `setTimeout` in `onBlur` exists because clicking a result triggers blur before the click event fires. With `Command.Item`'s `onSelect`, this is handled by the primitive's internal `pointerdown` handling. Replace `onBlur` with a click-outside detection using the Command root's container ref

5. **Panel positioning:**
   - The panel remains `absolute z-50 mt-2 w-full` (same as today)
   - Add `rounded-[var(--radius-lg)]` and `shadow-[var(--shh)]` using the theme tokens
   - Background: `bg-popover text-popover-foreground`

### 2B. Delete `SearchBrowseMenu` usage from KbSearch

**File:** `src/lib/components/organisms/KbSearch.svelte`

**Change:** When query is empty and input is focused, instead of rendering the full `SearchBrowseMenu` (two-panel coil browser), show a simplified Raycast-style pre-search state:

```
Command.Group heading="Suggested"
  - Command.Item for each scope: icon + "Browse Events" / "Browse Funding" etc.
  - These act as scope selectors AND navigation (clicking "Browse Events" either sets scope and shows results, or navigates to /events)

Command.Group heading="Popular Searches"
  - 4 popular search terms as Command.Items (same as today, just using the primitive)
```

This is dramatically simpler than the current `SearchBrowseMenu` two-panel layout. The homepage dropdown should feel fast and lightweight, not like a dashboard.

### 2C. Keyboard navigation additions

**File:** `src/lib/components/organisms/KbSearch.svelte`

**Add:**

- **Tab:** When results are visible, Tab moves focus into the result list (the Command primitive handles this via `aria-activedescendant`, but ensure the panel doesn't close on Tab)
- **Escape:** Close panel and blur input (already exists, keep it)
- Remove the manual `activeIndex` tracking — the Command primitive handles `aria-selected` state internally via `ArrowUp`/`ArrowDown`

### 2D. ARIA improvements

**Automatic from Command primitive:**

- `role="listbox"` on the list
- `role="option"` on each item
- `aria-selected` on the active item
- `aria-activedescendant` on the input pointing to the selected option
- `aria-expanded` on the combobox

**Manual additions:**

- Add `role="combobox"` to the outer container or input
- Add `aria-label="Search results"` to the Command.List
- Add `aria-live="polite"` region for the result count (e.g., "6 results" announced to screen readers)

---

## Phase 3: Polish PublicCommandPalette

### 3A. Clean up the input area

**File:** `src/lib/components/organisms/PublicCommandPalette.svelte`

**Changes:**

- Remove the scope badge from inside the input (the `<span>` with Sparkles icon overlaid at `left-3`)
- Remove the shortcut hint badge (`⌘K` at the right)
- Remove the submit arrow button
- The Command.Input becomes clean: just the built-in search icon from `command-input.svelte` + text
- Move scope selection to **filter chips below the input**, inside a `border-b` divider row:
  ```
  [All] [Events] [Funding] [Red Pages] [Jobs] [Toolbox]
  ```
  Active chip: `bg-primary text-primary-foreground rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium`
  Inactive: `text-muted-foreground hover:text-foreground`

### 3B. Simplify SearchBrowseMenu → inline suggestion groups

**File:** `src/lib/components/organisms/PublicCommandPalette.svelte`

**Change:** Replace `SearchBrowseMenu` with inline `Command.Group` items:

- Group "Browse": 5 items, one per coil (Events, Funding, Red Pages, Jobs, Toolbox) with icons. Selecting one either navigates to the browse page or sets the scope filter
- Group "Popular Searches": same as today but rendered as `Command.Item`
- Group "Pages": quick links (About, Privacy, etc.)

This eliminates the `SearchBrowseMenu` dependency from the palette entirely. `SearchBrowseMenu.svelte` can remain in the codebase if used elsewhere, but it should no longer be imported by either KbSearch or PublicCommandPalette.

### 3C. Add a Raycast-style footer bar

**File:** `src/lib/components/organisms/PublicCommandPalette.svelte`

**Add** below `Command.List`:

```svelte
<div
	class="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground"
>
	<div class="flex items-center gap-3">
		<span class="flex items-center gap-1"><kbd>↑↓</kbd> Navigate</span>
		<span class="flex items-center gap-1"><kbd>↵</kbd> Open</span>
		<span class="flex items-center gap-1"><kbd>esc</kbd> Close</span>
	</div>
	{#if query.trim().length >= MIN_SEARCH_QUERY_LENGTH}
		<button
			onclick={searchAll}
			class="flex items-center gap-1 font-medium text-foreground hover:text-primary"
		>
			View all results <ChevronRight class="h-3 w-3" />
		</button>
	{/if}
</div>
```

### 3D. Loading and empty state polish

**Files:**

- `src/lib/components/organisms/PublicCommandPalette.svelte`
- `src/lib/components/organisms/search/SearchCommandResults.svelte`

**Loading state:** Replace plain "Searching..." text with:

```svelte
<Command.Loading>
	<div class="flex items-center justify-center gap-2 py-8">
		<LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" />
		<span class="text-sm text-muted-foreground">Searching...</span>
	</div>
</Command.Loading>
```

**Empty state:** Replace plain text with:

```svelte
<Command.Empty>
	<div class="flex flex-col items-center gap-2 py-8">
		<SearchIcon class="h-6 w-6 text-muted-foreground/50" />
		<p class="text-sm text-muted-foreground">No results found</p>
		<p class="text-xs text-muted-foreground/70">Try a different search term</p>
	</div>
</Command.Empty>
```

---

## Phase 4: Polish AdminCommandPalette

### 4A. Same input cleanup

**File:** `src/lib/components/organisms/admin/AdminCommandPalette.svelte`

**Changes:** Mirror Phase 3A — remove the scope badge overlay and shortcut hint from inside the input. The admin palette doesn't need scope chips (it searches everything), so the input is just clean `Command.Input`.

### 4B. Same footer bar and loading/empty states

**File:** `src/lib/components/organisms/admin/AdminCommandPalette.svelte`

Add the same Raycast-style footer and polished loading/empty states as Phase 3C/3D.

### 4C. Normalize item border-radius

**Change:** Replace `rounded-xl` on `CommandUi.Item` class overrides with `rounded-[var(--radius-md)]` to match the unified system.

---

## Phase 5: SearchBrowseMenu Deprecation / Simplification

### Decision: Keep or remove?

After Phases 2B and 3B, `SearchBrowseMenu.svelte` is no longer imported by either search surface. Check if it's used anywhere else:

```
grep -r "SearchBrowseMenu" src/
```

Current results show it's only imported by `KbSearch.svelte` and `PublicCommandPalette.svelte`. After those are updated, `SearchBrowseMenu.svelte` becomes dead code.

**Action:** Leave the file in place initially (no deletion in this UI overhaul). Add a `// @deprecated — replaced by inline Command.Group items in KbSearch and PublicCommandPalette` comment. It can be removed in a follow-up cleanup.

---

## Phase 6: Mobile Optimization

### 6A. KbSearch mobile

**File:** `src/lib/components/organisms/KbSearch.svelte`

On mobile (`isMobile.current`):

- The scope filter chips below the input wrap naturally (flexbox wrap)
- The results panel gets `max-h-[60vh]` and `overflow-y-auto`
- Result items have slightly more padding (`py-2.5` vs `py-2`) for touch targets (minimum 44px)
- The footer bar hides keyboard hints on mobile (they're irrelevant) and only shows "View all results"

### 6B. PublicCommandPalette Drawer mobile

**File:** `src/lib/components/organisms/PublicCommandPalette.svelte`

Already uses Drawer on mobile — keep this. Changes:

- Scope chips get `overflow-x-auto whitespace-nowrap` for horizontal scroll on narrow screens
- Result items get larger touch targets
- Footer bar hides `kbd` hints, shows only action buttons

---

## Implementation Sequence

1. **Phase 1** (foundation) — Normalize radius tokens, establish highlight style, tighten result item layout in `SearchCommandResults.svelte` and `command-item.svelte`
2. **Phase 3** (PublicCommandPalette) — Clean input, replace SearchBrowseMenu, add footer bar, polish states. Do this before KbSearch because it's lower risk (already uses Command primitive)
3. **Phase 4** (AdminCommandPalette) — Mirror Phase 3 changes, quick pass
4. **Phase 2** (KbSearch) — The biggest change. Rewrite dropdown to Command primitive, clean input, simplified pre-search state. Test extensively because this is the homepage
5. **Phase 5** (cleanup) — Deprecate SearchBrowseMenu
6. **Phase 6** (mobile) — Test and tune touch targets, scroll behavior, drawer layout

---

## Risk Areas

1. **KbSearch rewrite (Phase 2)** is the highest-risk change. The current manual keyboard handling will be replaced entirely by the Command primitive. Test all keyboard paths: ArrowUp/Down wrapping, Enter navigation, Escape closing, typing while items are selected.

2. **Command primitive + non-modal panel**: The Command primitive is typically used inside a Dialog. Using it in a floating panel beneath a homepage input is less common. Verify that `shouldFilter={false}` works correctly and that `aria-activedescendant` properly links the external input to the list items.

3. **blur/focus management**: Removing the 140ms blur hack requires confirming that `Command.Item`'s `onSelect` fires before the panel closes. If the Command primitive uses `pointerdown` (which it does in bits-ui), this should work. But test on iOS Safari where touch event ordering differs.

4. **SearchBrowseMenu removal**: The two-panel browse experience is rich. Replacing it with simple Command.Group items is a deliberate simplification. Confirm with stakeholders that losing the "Quick Filters" and "Friendly Starts" two-column layout is acceptable in exchange for speed and consistency.

---

## Files Modified (Summary)

| File                                                              | Phase | Change                                           |
| ----------------------------------------------------------------- | ----- | ------------------------------------------------ |
| `src/lib/components/ui/command/command-item.svelte`               | 1     | Unified highlight style, radius tokens           |
| `src/lib/components/ui/command/command-link-item.svelte`          | 1     | Same as above                                    |
| `src/lib/components/organisms/search/SearchCommandResults.svelte` | 1, 3D | Tighter layout, radius, loading/empty            |
| `src/lib/components/organisms/KbSearch.svelte`                    | 2     | Full rewrite of dropdown to Command primitive    |
| `src/lib/components/organisms/PublicCommandPalette.svelte`        | 3     | Clean input, inline suggestions, footer          |
| `src/lib/components/organisms/admin/AdminCommandPalette.svelte`   | 4     | Mirror of Phase 3 changes                        |
| `src/lib/components/organisms/SearchBrowseMenu.svelte`            | 5     | Deprecation comment                              |
| `src/routes/+page.svelte`                                         | —     | No changes needed (KbSearch interface unchanged) |

No new files required. All changes are modifications to existing components.
