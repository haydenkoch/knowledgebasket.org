# Fix /toolbox White Screen + Streamline Auth Origins

## Context

Signed-in users see a white screen on `/toolbox` immediately after the page loads (SSR renders, then goes blank). The user suspects Better Auth and origin configuration are misaligned and wants everything streamlined to localhost.

**Root cause is almost certainly a client-side JS crash** — SSR succeeds (the page renders), then something throws during hydration or post-mount effects, killing the component tree. The white screen only affects signed-in users because extra components render when `data.user` is truthy (Popover account menu in KbHeader, signed-in footer in KbPublicNavSidebar).

A contributing factor: `vite.config.ts` has `server.host: true` (binds to `0.0.0.0`), so the dev server is accessible via LAN IPs, but `ORIGIN` is hardcoded to `http://localhost:5173`. This origin mismatch can cause cookie/CSP issues.

## Plan

### Step 1: Reproduce and capture the actual error

Run `pnpm dev`, sign in, visit `/toolbox`, check browser console. This is essential — every fix below is informed by code analysis but the exact crash needs confirmation.

### Step 2: Fix origin ambiguity in vite config

**File: `vite.config.ts`** (line 62)

Change `host: true` → `host: 'localhost'` so the dev server only binds to localhost, matching `ORIGIN`.

```ts
server: {
    host: 'localhost',
    strictPort: true
}
```

### Step 3: Add explicit `trustedOrigins` to Better Auth

**File: `src/lib/server/auth.ts`** (line 10)

Add `trustedOrigins` for clarity and production safety:

```ts
export const auth = betterAuth({
	baseURL: env.ORIGIN,
	trustedOrigins: [env.ORIGIN],
	secret: env.BETTER_AUTH_SECRET
	// ...rest unchanged
});
```

### Step 4: Guard the KbHeader `$effect` for browser-only

**File: `src/lib/components/organisms/KbHeader.svelte`** (lines 39-42)

The `$effect` that calls `sidebar.setOpenMobile(false)` runs during SSR. Guard it:

```ts
import { browser } from '$app/environment';

$effect(() => {
	void pathname;
	if (browser) sidebar.setOpenMobile(false);
});
```

### Step 5: Fix the probable Popover hydration crash

**File: `src/lib/components/organisms/KbHeader.svelte`**

If Step 1 confirms the Popover is crashing, defer its rendering until after mount:

```svelte
<script>
	import { onMount } from 'svelte';
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

{#if user && mounted}
	<Popover.Root>...</Popover.Root>
{:else if user}
	<span class="kb-header__user-btn">
		<UserIcon class="kb-header__user-icon" />
		<span class="kb-header__user-name">{displayName}</span>
	</span>
{/if}
```

### Step 6: Add error boundary to root layout

**File: `src/routes/+layout.svelte`**

Wrap header/sidebar in `<svelte:boundary>` so future crashes in layout chrome never produce a white screen:

```svelte
<svelte:boundary onerror={(e) => console.error('Layout error:', e)}>
	<KbHeader logoUrl={data.brandLogoUrl} user={data.user} />
</svelte:boundary>
```

### Step 7: Widen dev CSP connect-src

**File: `src/hooks.server.ts`** (line 66)

Add `http://0.0.0.0:*` to the dev connect-src list as a safety net (in case `host: true` is ever restored):

```ts
if (dev) {
	connectSrc.push('ws:', 'wss:', 'http://localhost:*', 'http://127.0.0.1:*', 'http://0.0.0.0:*');
}
```

## Critical files

- `vite.config.ts` — origin binding
- `src/lib/server/auth.ts` — Better Auth config
- `src/lib/components/organisms/KbHeader.svelte` — Popover + $effect
- `src/routes/+layout.svelte` — error boundary
- `src/hooks.server.ts` — CSP

## Verification

1. Run `pnpm dev` and confirm it binds to `localhost:5173` only
2. Sign in, visit `/toolbox` — page should render without white screen
3. Check browser console for zero JS errors
4. Test the account popover opens/closes correctly
5. Test mobile sidebar toggle still works
6. Visit `/toolbox` signed out — should still work as before
