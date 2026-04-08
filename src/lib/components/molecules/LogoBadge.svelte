<script lang="ts">
	import { getPublicAssetBaseUrl, resolveAbsoluteUrl } from '$lib/config/public-assets';

	type LogoBadgeSize = 'card' | 'hero';
	type LogoTone = 'light' | 'dark';
	type LogoLayout = 'standard' | 'wide';

	let {
		src = null,
		alt = '',
		fallbackText = '?',
		size = 'card',
		containerClass = ''
	}: {
		src?: string | null;
		alt?: string;
		fallbackText?: string;
		size?: LogoBadgeSize;
		containerClass?: string;
	} = $props();

	let logoTone = $state<LogoTone>('light');
	let logoLayout = $state<LogoLayout>('standard');

	const resolvedSrc = $derived(resolveLogoUrl(src));
	const rootClass = $derived(
		`logo-badge logo-badge--${size} logo-badge--${logoTone} ${containerClass}`.trim()
	);
	const imageClass = $derived(
		`logo-badge__image ${logoLayout === 'wide' ? 'logo-badge__image--wide' : 'logo-badge__image--standard'}`
	);

	$effect(() => {
		const currentSrc = resolvedSrc;
		if (!currentSrc) {
			logoTone = 'light';
			logoLayout = 'standard';
			return;
		}

		logoTone = 'light';
		logoLayout = 'standard';
	});

	function resolveLogoUrl(value: string | null | undefined): string | null {
		const raw = value?.trim();
		if (!raw) return null;

		if (raw.startsWith('/uploads/')) return raw;
		if (raw.startsWith('uploads/')) return `/${raw}`;

		const absolute = resolveAbsoluteUrl(raw) ?? raw;
		try {
			const assetBase = new URL(getPublicAssetBaseUrl());
			const resolved = new URL(absolute, assetBase);
			const basePath = assetBase.pathname.replace(/\/+$/, '');

			if (resolved.origin === assetBase.origin && resolved.pathname.startsWith(`${basePath}/`)) {
				const relativeObjectKey = resolved.pathname.slice(basePath.length + 1);
				return `/uploads/${relativeObjectKey}`;
			}
		} catch {
			// Keep the resolved asset URL when local upload rewriting is not possible.
		}

		return absolute;
	}

	function handleLogoLoad(event: Event) {
		const image = event.currentTarget;
		if (!(image instanceof HTMLImageElement)) return;

		const width = image.naturalWidth || 1;
		const height = image.naturalHeight || 1;
		const aspectRatio = width / height;
		logoLayout = aspectRatio > 1.55 ? 'wide' : 'standard';

		let nextTone: LogoTone = aspectRatio > 1.8 ? 'dark' : 'light';

		try {
			const canvas = document.createElement('canvas');
			const size = 48;
			canvas.width = size;
			canvas.height = size;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) {
				logoTone = nextTone;
				return;
			}

			context.clearRect(0, 0, size, size);
			context.drawImage(image, 0, 0, size, size);
			const { data } = context.getImageData(0, 0, size, size);

			let visiblePixels = 0;
			let brightPixels = 0;
			let luminanceSum = 0;

			for (let i = 0; i < data.length; i += 4) {
				const alpha = data[i + 3] / 255;
				if (alpha < 0.08) continue;

				const red = data[i];
				const green = data[i + 1];
				const blue = data[i + 2];
				const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

				visiblePixels += 1;
				luminanceSum += luminance;
				if (luminance >= 188) brightPixels += 1;
			}

			if (visiblePixels === 0) {
				logoTone = nextTone;
				return;
			}

			const visibleRatio = visiblePixels / (size * size);
			const averageLuminance = luminanceSum / visiblePixels;
			const brightRatio = brightPixels / visiblePixels;

			if (
				(brightRatio > 0.52 && visibleRatio < 0.74) ||
				(averageLuminance > 176 && aspectRatio > 1.35) ||
				(brightRatio > 0.68 && averageLuminance > 160)
			) {
				nextTone = 'dark';
			} else {
				nextTone = 'light';
			}
		} catch {
			// Keep the aspect-ratio fallback when pixel analysis is blocked.
		}

		logoTone = nextTone;
	}
</script>

{#if resolvedSrc}
	<div class={rootClass}>
		<img
			src={resolvedSrc}
			{alt}
			class={imageClass}
			loading="lazy"
			crossorigin="anonymous"
			onload={handleLogoLoad}
		/>
	</div>
{:else}
	<div class={`${rootClass} logo-badge--fallback`}>
		<span class="logo-badge__fallback">{fallbackText}</span>
	</div>
{/if}

<style>
	.logo-badge {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 999px;
		transition:
			background 140ms ease,
			box-shadow 140ms ease;
	}

	.logo-badge--card {
		width: 4rem;
		height: 4rem;
		border: 1px solid var(--rule);
		box-shadow: var(--shh);
	}

	.logo-badge--hero {
		width: 112px;
		height: 112px;
		border: 3px solid var(--background);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
	}

	.logo-badge--light {
		background:
			radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.98) 0%, rgba(248, 244, 239, 1) 100%),
			linear-gradient(180deg, #ffffff 0%, #f6f0ea 100%);
	}

	.logo-badge--dark {
		background:
			radial-gradient(
				circle at 50% 38%,
				rgba(255, 255, 255, 0.24) 0%,
				rgba(255, 255, 255, 0.08) 28%,
				rgba(255, 255, 255, 0.04) 44%,
				rgba(34, 29, 24, 0.96) 100%
			),
			linear-gradient(145deg, #433a32 0%, #1f1b18 100%);
	}

	.logo-badge--fallback {
		background: linear-gradient(145deg, #537a62 0%, #2d4f3c 100%);
	}

	.logo-badge__image {
		display: block;
		flex: none;
		object-fit: contain;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.16))
			drop-shadow(0 0 10px rgba(255, 255, 255, 0.08));
	}

	.logo-badge__image--standard {
		width: 72%;
		height: 72%;
	}

	.logo-badge__image--wide {
		width: 90%;
		height: 58%;
	}

	.logo-badge__fallback {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1;
		color: white;
	}

	.logo-badge--hero .logo-badge__fallback {
		font-family: var(--font-serif);
		font-size: 2.25rem;
	}

	.logo-badge--card .logo-badge__fallback {
		font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
	}
</style>
