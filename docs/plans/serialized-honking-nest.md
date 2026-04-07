# Plan: Landscape Photos Behind Hero Gradients

## Context

The `KbHero` component currently renders a solid color gradient as the hero background on the home page and all six coil pages. MinIO already has 12 processed landscape photos (multiple widths, WebP + JPG) that are used as placeholders on detail/card views. The goal is to use those same photos as background images in the heroes — placing them behind the existing gradient so the color identity is preserved but a landscape texture bleeds through.

## Available Landscape Photos

From `src/lib/data/landscape-manifest.generated.ts` (12 entries, widths: 320/640/960/1280/1920):

| Index | Slug                                   |
| ----- | -------------------------------------- |
| 0     | `carson-pass-2-winnemucca-lk-2`        |
| 1     | `easter-sierra-winter-2014-11`         |
| 2     | `eastern-sierra-summer-2012-3123-edit` |
| 3     | `kiva-beach-sunset-9`                  |
| 4     | `mt-muir-from-trail-crest-6539`        |
| 5     | `sierra-fall-8937`                     |
| 6     | `tahoe-summer-2013-8533`               |
| 7     | `tunnel-view-5282`                     |
| 8     | `tunnel-view-edit-2`                   |
| 9     | `volcanic-tablelands-spring-2014-1`    |
| 10    | `yosemite-may-2015-4010`               |
| 11    | `yosemite-spring-2016-1`               |

## Proposed Coil → Landscape Assignments

| Coil     | Index | Photo                     |
| -------- | ----- | ------------------------- |
| home     | 7     | Tunnel View               |
| events   | 3     | Kiva Beach Sunset         |
| funding  | 4     | Mt. Muir From Trail Crest |
| jobs     | 2     | Eastern Sierra Summer     |
| redpages | 6     | Tahoe Summer              |
| toolbox  | 9     | Volcanic Tablelands       |

## Implementation

### File: `src/lib/components/organisms/KbHero.svelte`

**Single file change.** No page-level changes needed — the default assignments live in the component.

1. **Import** `getPlaceholderImage` from `$lib/data/placeholders`.

2. **Add optional `bgImage` prop** for per-page override if ever needed.

3. **Add coil → landscape index map**, derive `resolvedBgImage` from it (or the `bgImage` override).

4. **Render an `<img>` as the bottom-most absolute layer** (below the gradient div):

   ```svelte
   <img
   	src={resolvedBgImage}
   	alt=""
   	aria-hidden="true"
   	class="pointer-events-none absolute inset-0 h-full w-full object-cover"
   	loading="eager"
   	fetchpriority="high"
   />
   ```

5. **Reduce gradient overlay opacity** so the photo bleeds through while color is preserved. Change the gradient div from no opacity to `opacity-[0.82]`:
   ```svelte
   <div
   	class="pointer-events-none absolute inset-0 opacity-[0.82]"
   	style="background: {bgGradient}"
   ></div>
   ```

The weave SVG overlay and content div stay unchanged.

## Verification

1. `pnpm dev` — visit `/`, `/events`, `/funding`, `/jobs`, `/red-pages`, `/toolbox` and confirm landscape photo is visible behind the gradient on each hero.
2. Confirm text is still legible (white text on tinted photo background).
3. Confirm the weave SVG still renders on top.
4. On a slow connection, confirm the hero does not flash unstyled (gradient renders instantly via CSS; image loads in behind it).
