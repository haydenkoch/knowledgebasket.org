<script lang="ts">
	import logoFallback from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<div class="auth-shell">
	<header class="auth-shell__brand">
		<a href="/" class="auth-shell__brand-link">
			<img src={data.brandLogoUrl ?? logoFallback} alt="" class="auth-shell__logo" />
			<span class="auth-shell__name">
				Knowledge Basket
				<span class="auth-shell__org">Indigenous Futures Society</span>
			</span>
		</a>
	</header>

	<main class="auth-shell__content">
		{@render children()}
	</main>

	<footer class="auth-shell__footer">
		<p>© {new Date().getFullYear()} Indigenous Futures Society</p>
	</footer>
</div>

<style>
	.auth-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--background);
		padding: 24px 16px 32px;
	}

	.auth-shell__brand {
		width: 100%;
		max-width: 420px;
		margin-bottom: 32px;
	}

	.auth-shell__brand-link {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		border-radius: 6px;
		padding: 4px 0;
	}

	.auth-shell__brand-link:hover {
		text-decoration: none;
	}

	.auth-shell__brand-link:focus-visible {
		outline: 2px solid var(--color-flicker-400);
		outline-offset: 4px;
	}

	.auth-shell__logo {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--color-lakebed-200);
		flex-shrink: 0;
	}

	.auth-shell__name {
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-lakebed-950);
		line-height: 1.25;
	}

	.auth-shell__org {
		display: block;
		font-size: 10.5px;
		font-weight: 400;
		letter-spacing: 0.01em;
		text-transform: none;
		color: var(--color-obsidian-500);
		margin-top: 1px;
	}

	.auth-shell__content {
		width: 100%;
		max-width: 420px;
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.auth-shell__footer {
		margin-top: 32px;
		font-family: var(--font-sans);
		font-size: 11px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-obsidian-700);
	}
</style>
