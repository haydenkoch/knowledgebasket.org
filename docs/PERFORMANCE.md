# Performance Notes

## Current Hotspots

The largest performance risks in the current app are:

- the events page derived-filter chain
- the events calendar bundle
- large route-level components
- bundle size on the client build

The events experience should stay fast without losing the current filter-bar interaction model.

## What Has Already Been Done

- Calendar loading is deferred until the calendar view is opened.
- URL sync behavior on the events page has already been softened to reduce jarring view switches.
- The events filter system already separates slider drag state from committed date-range state.

## What To Improve Next

### Perceived performance

Prioritize the places users will actually feel:

- global search responsiveness
- events search/filter responsiveness
- slider drag and commit behavior
- calendar view switches
- image loading on list/detail pages
- heavy admin editor loads

### Real performance

Prioritize:

- splitting large route files by behavior
- code-splitting heavy editor/calendar paths
- reducing oversized client chunks
- avoiding repeated filtering/sorting work during drag interactions
- keeping route data lean

## Profiling Workflow

Use this order:

1. Browser Performance panel for long tasks and layout thrash.
2. Lighthouse for bundle and main-thread diagnostics.
3. Svelte warnings and build output.
4. Targeted instrumentation inside the events filter chain when interaction lag is suspected.

## Performance Rules

- Preserve the existing filter-bar interaction model.
- Avoid premature rewrites.
- Improve shared patterns before micro-optimizing one-off pages.
- Treat route decomposition as both a maintainability and performance investment.
