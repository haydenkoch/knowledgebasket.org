# Knowledge Basket UI System

## Foundation

Knowledge Basket should keep using `shadcn-svelte` primitives as the primary UI foundation.

- Prefer `src/lib/components/ui/**` first.
- Build thin KB wrappers and composites around those primitives when a pattern repeats.
- Do not grow a parallel custom design system unless a product-specific interaction truly requires it.

## What To Preserve

### Events filter bar

The current events filter bar is one of the strongest product-specific interactions in the app. It combines:

- inline search
- view switching
- date exploration
- facet refinement

That interaction model should be preserved. Improve it by tightening focus states, URL persistence, popover consistency, mobile containment, and slider performance. Do not replace it with a different navigation pattern unless there is a critical product reason.

### shadcn-svelte base

Stay close to the base components for:

- buttons
- inputs
- selects
- tabs
- popovers
- command menus
- dialogs
- cards
- tables
- field structure

Customize through tokens, composition, and small wrappers before reaching for bespoke markup or one-off CSS.

## Current Reality

The app currently mixes:

- shadcn-svelte primitives
- route-local Tailwind
- scoped component CSS
- KB-specific classes such as `.kb-*`

That is already the real implementation. Older guidance that says the app is "Tailwind only" or forbids new KB classes no longer matches the repo. Going forward:

- prefer utility classes and shadcn primitives by default
- keep scoped CSS for third-party overrides or highly specific product interactions
- avoid introducing new global style layers unless a shared pattern genuinely needs one

## Layout And Spacing

Standardize around a small set of shared layout patterns:

- one public page max width
- one content gutter rhythm
- one card density scale
- one list-row density scale
- one detail-page sidebar pattern
- one form section rhythm

The current product feels inconsistent mainly because spacing, grouping, and page structure change too much between coils.

## Typography

Use a clear consumer-facing hierarchy:

- hero / page title
- section title
- body copy
- support metadata
- micro labels

Avoid mixing warm public pages with dense admin-like typography unless the page is truly an admin workflow.

## Navigation

Standardize toward:

- one primary public shell
- one clear mobile navigation behavior
- one consistent coil navigation strategy
- no duplicated navigation blocks competing with each other

The goal is to make the product feel like one app, not five adjacent route trees.

## Lists, Cards, And Detail Pages

Shared patterns should exist for:

- hero headers
- featured cards
- list rows
- metadata groups
- action blocks
- related-content sidebars
- empty states
- loading states
- error states

Coils can still have different voice and content, but they should not each reinvent hierarchy and spacing.

## Forms

Submission and admin forms should share:

- common section shells
- consistent labels/help text
- predictable button placement
- consistent success/error messaging
- a warmer tone than the current scaffold/admin feel

Event submission is the current reference point, but the tone and information architecture still need refinement before the same patterns should be copied everywhere.

## Visual Direction

The product should move toward:

- polished
- warm
- trustworthy
- visual
- intuitive

It should move away from:

- developer-scaffold feel
- admin-panel feel
- flat text-heavy layouts
- awkward spacing
- duplicated navigation
- inconsistent responsive behavior

Use imagery, logos, map surfaces, badges, and grouped metadata intentionally so pages feel human and informative rather than database-like.
