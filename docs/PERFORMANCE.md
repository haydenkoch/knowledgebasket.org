# Performance audit guide

How to find and fix UI lag, sluggish buttons, glitchy sliders, and scroll jank on the events page (and elsewhere).

## 1. Chrome DevTools – Performance tab

**Goal:** Find long tasks and layout thrash.

1. Open **DevTools → Performance**.
2. Click **Record**, interact with the page (switch views, drag the date slider, scroll, click filters), then stop.
3. In the **Main** thread flame chart:
   - **Long yellow blocks** (> ~50 ms) = long tasks that can block clicks and cause lag. Click to see which function (often `$effect`, `flush`, or a filter/sort).
   - **Purple “Layout” / “Recalc Style”** right after script = layout thrash (DOM reads/writes forcing reflows).
4. **Summary:** If “Scripting” or “Rendering” time is high during a simple click or drag, that action is doing too much work.

## 2. Chrome DevTools – Rendering

1. **DevTools → More tools → Rendering**.
2. Enable **“Layout Shift Regions”** (blue flash) to see CLS; **“Frame Rendering Stats”** to see FPS.
3. Scroll and interact: if FPS drops a lot or you see many blue flashes, track down which components or effects run on scroll/resize.

## 3. Svelte reactivity

The events page has a long **$derived** chain (search → cost → region → type → date → filtered). Each dependency change can recompute the chain.

- **Audit:** Add a temporary `console.log` or breakpoint inside a `$derived` or `$effect` and see how often it runs when you move the slider or click a tab.
- **Improvements:** Prefer computing once and passing data down; throttle or batch updates (e.g. slider: update list only on commit, not every drag tick); avoid reading `page` or other stores inside effects that run on every view change if you can.

## 4. What to fix first

| Symptom | Likely cause | Where to look |
|--------|----------------|----------------|
| Buttons lag on click | Heavy work in `$effect` after state change (e.g. URL sync, re-renders) | URL sync effect, view tab handler |
| Slider feels glitchy | Too many state updates per frame during drag; full filter chain re-running | `onValueChange` → `sliderIndices` → derived chain; date histogram re-render |
| Scroll → content disappears/snaps | Layout reflow, conditional rendering on scroll/resize, or too many DOM nodes | Sidebar/main layout; `IsMobile` / media queries; long lists without virtualization |
| Tabs feel slow | `goto()` or load running synchronously right after tab change | URL sync effect calling `goto` immediately |

## 5. Quick wins applied in code

- **URL sync:** Deferred to next tick so the tab UI updates before navigation.
- **Slider:** Throttled parent updates during drag so the histogram and derived state don’t re-run every pointer move.
- **Calendar:** Lazy-loaded; recreated when returning to calendar view so it doesn’t reuse a detached instance.

## 6. Further improvements

- **Virtualize long lists:** If the events list grows large, render only visible items (e.g. `svelte-virtual-list` or a custom windowing component).
- **Reduce derived chain:** Consider one memoized “filtered events” that only recomputes when search/filters/date actually change, and avoid re-running on slider drag (use local drag state for thumbs only).
- **Profile with Svelte DevTools:** If available for Svelte 5, inspect component re-renders and effect runs.
- **Lighthouse:** Run Performance + Diagnostics for LCP, TBT, and “Avoid long main-thread tasks” and fix the worst offenders.
