<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		expanded?: boolean;
		peekHeight?: number;
		maxHeight?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		expanded = $bindable(false),
		peekHeight = 136,
		maxHeight = 'min(82vh, 44rem)',
		class: className = '',
		children
	}: Props = $props();

	let panelEl = $state<HTMLDivElement | null>(null);
	let panelHeight = $state(0);
	let ready = $state(false);
	let dragging = $state(false);
	let dragStartY = 0;
	let dragStartTranslate = 0;
	let dragTranslate = $state(0);

	function measurePanel() {
		panelHeight = panelEl?.offsetHeight ?? 0;
	}

	$effect(() => {
		if (!panelEl) return;
		measurePanel();
		const observer = new ResizeObserver(() => {
			measurePanel();
		});
		observer.observe(panelEl);
		return () => observer.disconnect();
	});

	// Once measured, slide the panel in from below on the next frame
	$effect(() => {
		if (panelHeight > 0 && !ready) {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					ready = true;
				});
			});
		}
	});

	// Lock body scroll when expanded or dragging
	$effect(() => {
		if (expanded || dragging) {
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = '';
			};
		}
	});

	const collapsedTranslate = $derived(Math.max(0, panelHeight - peekHeight));
	const restingTranslate = $derived(expanded ? 0 : collapsedTranslate);
	const translateY = $derived(
		dragging ? Math.max(0, Math.min(collapsedTranslate, dragTranslate)) : restingTranslate
	);

	function shouldIgnoreDrag(target: EventTarget | null): boolean {
		return target instanceof HTMLElement && !!target.closest('[data-peek-ignore-drag]');
	}

	function handlePointerDown(event: PointerEvent) {
		if (shouldIgnoreDrag(event.target)) return;
		if (!(event.currentTarget instanceof HTMLElement)) return;
		dragging = true;
		dragStartY = event.clientY;
		dragStartTranslate = restingTranslate;
		dragTranslate = restingTranslate;
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		if (Math.abs(event.clientY - dragStartY) > 4) dragMoved = true;
		dragTranslate = dragStartTranslate + (event.clientY - dragStartY);
	}

	let dragMoved = false;

	function finishDrag(event: PointerEvent) {
		if (!dragging) return;
		if (
			event.currentTarget instanceof HTMLElement &&
			event.currentTarget.hasPointerCapture(event.pointerId)
		) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		const wasDrag = dragMoved;
		dragging = false;
		dragMoved = false;

		if (!wasDrag && expanded) {
			// Tap on handle while expanded → collapse
			expanded = false;
			dragTranslate = collapsedTranslate;
			return;
		}

		expanded = dragTranslate < collapsedTranslate / 2;
		dragTranslate = expanded ? 0 : collapsedTranslate;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		expanded = !expanded;
		dragTranslate = expanded ? 0 : collapsedTranslate;
	}
</script>

<div
	class={`mobile-peek-panel ${className}`.trim()}
	bind:this={panelEl}
	style={`--mobile-peek-height:${peekHeight}px; --mobile-peek-max-height:${maxHeight};${ready ? ` transform: translate3d(0, ${translateY}px, 0);` : ' transform: translate3d(0, 100%, 0); transition: none;'}`}
>
	<button
		type="button"
		class="mobile-peek-panel__drag-zone"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={finishDrag}
		onpointercancel={finishDrag}
		onkeydown={handleKeydown}
		aria-label={expanded ? 'Collapse filter panel' : 'Expand filter panel'}
	>
		<div class="mobile-peek-panel__handle" aria-hidden="true"></div>
	</button>
	<div class="mobile-peek-panel__content">
		{@render children?.()}
	</div>
</div>

<style>
	.mobile-peek-panel {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 45;
		display: flex;
		flex-direction: column;
		max-height: var(--mobile-peek-max-height);
		padding-bottom: max(env(safe-area-inset-bottom), 0.75rem);
		border-top-left-radius: 1.5rem;
		border-top-right-radius: 1.5rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-bottom: none;
		box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.1);
		transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform;
	}

	.mobile-peek-panel__drag-zone {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0 0.35rem;
		touch-action: none;
		flex: 0 0 auto;
		cursor: grab;
		border: none;
		width: 100%;
		background: transparent;
	}

	.mobile-peek-panel__content {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overscroll-behavior: contain;
	}

	.mobile-peek-panel__handle {
		width: 2.5rem;
		height: 0.25rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--muted-foreground) 24%, transparent);
		flex: 0 0 auto;
	}

	@media (min-width: 768px) {
		.mobile-peek-panel {
			display: none;
		}
	}
</style>
