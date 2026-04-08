<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { cn } from '$lib/utils';
	import {
		loadPdfJs,
		type PDFDocumentLoadingTask,
		type PDFDocumentProxy,
		type RenderTask
	} from '$lib/toolbox/pdfjs';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';

	type ThumbnailState = {
		pageNumber: number;
		dataUrl: string | null;
		status: 'idle' | 'loading' | 'ready' | 'error';
	};

	let {
		src,
		title,
		class: className
	}: {
		src: string;
		title: string;
		class?: string;
	} = $props();

	let viewerRoot = $state<HTMLElement | null>(null);
	let pageViewport = $state<HTMLDivElement | null>(null);
	let stageScroller = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let pdfDoc = $state<PDFDocumentProxy | null>(null);
	let loadingTask: PDFDocumentLoadingTask | null = null;
	let renderTask: RenderTask | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let hasMounted = $state(false);
	let pendingLoadFrame = 0;
	let renderGeneration = 0;
	let loadGeneration = 0;
	let thumbQueue: number[] = [];
	const queuedThumbs = new Set<number>();
	let processingThumbs = false;

	let viewerState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let renderState = $state<'idle' | 'rendering' | 'ready' | 'error'>('idle');
	let errorMessage = $state('');
	let loadProgress = $state<number | null>(null);
	let pageCount = $state(0);
	let currentPage = $state(1);
	let pageInput = $state('1');
	let viewportWidth = $state(0);
	let paperWidth = $state(0);
	let paperHeight = $state(0);
	let zoomMultiplier = $state(1);
	let currentZoomPercent = $state(100);
	let pageAspect = $state(8.5 / 11);
	let canFullscreen = $state(false);
	let isFullscreen = $state(false);
	let thumbnails = $state<ThumbnailState[]>([]);
	let lastLoadedSrc = '';

	const showThumbRail = $derived(viewerState === 'ready' && pageCount > 1);
	const currentPageLabel = $derived(
		pageCount ? `Page ${currentPage} of ${pageCount}` : 'Preparing'
	);
	const viewerStatus = $derived.by(() => {
		if (viewerState === 'error') return 'Preview unavailable';
		if (viewerState === 'loading') {
			return loadProgress === null ? 'Loading document' : `Loading document · ${loadProgress}%`;
		}
		return currentPageLabel;
	});

	function clampPage(value: number) {
		return Math.min(pageCount || 1, Math.max(1, Math.round(value)));
	}

	function syncPageInput() {
		pageInput = String(currentPage);
	}

	function updateViewportWidth() {
		const clientWidth = pageViewport?.clientWidth ?? 0;
		if (!clientWidth) return;
		// Mirror the stage padding in CSS (1rem desktop, 0.75rem below 760px) so the
		// JS-driven paper width matches the stage's actual content box.
		const horizontalPadding = window.innerWidth < 760 ? 24 : 32;
		const nextWidth = Math.max(0, clientWidth - horizontalPadding);
		if (!nextWidth || Math.abs(nextWidth - viewportWidth) < 2) return;
		viewportWidth = nextWidth;
	}

	function updateThumbnail(pageNumber: number, patch: Partial<ThumbnailState>) {
		const index = pageNumber - 1;
		if (index < 0 || index >= thumbnails.length) return;

		thumbnails = thumbnails.map((thumb, thumbIndex) =>
			thumbIndex === index ? { ...thumb, ...patch } : thumb
		);
	}

	function seedThumbnails(totalPages: number) {
		thumbnails = Array.from({ length: totalPages }, (_, index) => ({
			pageNumber: index + 1,
			dataUrl: null,
			status: 'idle'
		}));
	}

	function queueThumbnail(pageNumber: number) {
		if (
			!browser ||
			!pdfDoc ||
			pageNumber < 1 ||
			pageNumber > pageCount ||
			queuedThumbs.has(pageNumber)
		) {
			return;
		}

		const thumb = thumbnails[pageNumber - 1];
		if (!thumb || thumb.status === 'ready' || thumb.status === 'loading') return;

		queuedThumbs.add(pageNumber);
		updateThumbnail(pageNumber, { status: 'loading' });
		thumbQueue = [...thumbQueue, pageNumber];
		void processThumbnailQueue();
	}

	async function processThumbnailQueue() {
		if (!browser || !pdfDoc || processingThumbs) return;
		processingThumbs = true;

		while (thumbQueue.length > 0 && pdfDoc) {
			const nextPage = thumbQueue.shift();
			if (!nextPage) continue;
			queuedThumbs.delete(nextPage);

			try {
				const page = await pdfDoc.getPage(nextPage);
				const baseViewport = page.getViewport({ scale: 1 });
				const scale = 124 / baseViewport.width;
				const viewport = page.getViewport({ scale });
				const thumbCanvas = document.createElement('canvas');
				const context = thumbCanvas.getContext('2d', { alpha: false });
				if (!context) throw new Error('Unable to render thumbnail');

				thumbCanvas.width = Math.max(1, Math.floor(viewport.width));
				thumbCanvas.height = Math.max(1, Math.floor(viewport.height));

				await page.render({
					canvas: thumbCanvas,
					canvasContext: context,
					viewport
				}).promise;

				updateThumbnail(nextPage, {
					dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.84),
					status: 'ready'
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'RenderingCancelledException') {
					break;
				}

				updateThumbnail(nextPage, { status: 'error' });
			}

			await new Promise((resolve) => window.setTimeout(resolve, 0));
		}

		processingThumbs = false;
	}

	function queueThumbnailCluster(pageNumber: number) {
		for (const offset of [-2, -1, 0, 1, 2, 3, 4]) {
			queueThumbnail(pageNumber + offset);
		}
	}

	function warmInitialThumbnails() {
		const initialPages = Array.from({ length: Math.min(pageCount, 10) }, (_, index) => index + 1);
		for (const pageNumber of initialPages) {
			queueThumbnail(pageNumber);
		}
	}

	function scheduleDocumentLoad(nextSrc: string) {
		if (!browser || !nextSrc || nextSrc === lastLoadedSrc) return;

		if (pendingLoadFrame) {
			window.cancelAnimationFrame(pendingLoadFrame);
		}

		// Wait until after hydration/paint so the SSR shell can be claimed safely.
		pendingLoadFrame = window.requestAnimationFrame(() => {
			pendingLoadFrame = 0;
			void loadDocument(nextSrc);
		});
	}

	async function destroyDocument() {
		renderTask?.cancel();
		renderTask = null;

		if (loadingTask) {
			await loadingTask.destroy().catch(() => undefined);
			loadingTask = null;
		}

		if (pdfDoc) {
			await pdfDoc.destroy().catch(() => undefined);
			pdfDoc = null;
		}

		thumbQueue = [];
		queuedThumbs.clear();
		thumbnails = [];
		processingThumbs = false;
		pageCount = 0;
		currentPage = 1;
		viewportWidth = 0;
		paperWidth = 0;
		paperHeight = 0;
		syncPageInput();
	}

	async function fetchPdfBytes(url: string, generation: number) {
		const response = await fetch(url, {
			headers: {
				accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8'
			}
		});

		if (!response.ok) {
			throw new Error(`Preview request failed with status ${response.status}.`);
		}

		const total = Number(response.headers.get('content-length') ?? 0);
		if (!response.body || !Number.isFinite(total) || total <= 0) {
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (generation === loadGeneration) {
				loadProgress = 100;
			}
			return bytes;
		}

		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let loaded = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			if (generation !== loadGeneration) {
				throw new Error('__stale__');
			}

			if (value) {
				chunks.push(value);
				loaded += value.length;
				loadProgress = Math.max(1, Math.min(100, Math.round((loaded / total) * 100)));
			}
		}

		const bytes = new Uint8Array(loaded);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.length;
		}

		return bytes;
	}

	async function renderPage(
		document: PDFDocumentProxy,
		targetCanvas: HTMLCanvasElement,
		pageNumber: number,
		width: number,
		multiplier: number
	) {
		if (!browser) return;
		const generation = ++renderGeneration;

		const previousTask = renderTask;
		if (previousTask) {
			previousTask.cancel();
			await previousTask.promise.catch(() => undefined);
			if (generation !== renderGeneration) return;
		}

		renderState = 'rendering';
		let nextTask: RenderTask | null = null;

		try {
			const page = await document.getPage(pageNumber);
			const baseViewport = page.getViewport({ scale: 1 });
			pageAspect = baseViewport.width / baseViewport.height;
			const fitWidth = Math.max(width, 220);
			const effectivePaperWidth = Math.round(fitWidth * multiplier);
			const effectivePaperHeight = Math.round(effectivePaperWidth / pageAspect);
			paperWidth = effectivePaperWidth;
			paperHeight = effectivePaperHeight;
			const fitScale = fitWidth / baseViewport.width;
			const effectiveScale = fitScale * multiplier;
			const viewport = page.getViewport({ scale: effectiveScale });
			const context = targetCanvas.getContext('2d', { alpha: false });
			if (!context) throw new Error('Unable to render page');

			const outputScale = Math.min(window.devicePixelRatio || 1, 2);
			targetCanvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
			targetCanvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
			targetCanvas.style.width = `${viewport.width}px`;
			targetCanvas.style.height = `${viewport.height}px`;

			context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

			nextTask = page.render({
				canvas: targetCanvas,
				canvasContext: context,
				viewport,
				transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]
			});
			renderTask = nextTask;

			await nextTask.promise;
			if (generation !== renderGeneration) return;
			// Show zoom relative to fit-to-width: 100% means "fits the column".
			currentZoomPercent = multiplier * 100;
			renderState = 'ready';
		} catch (error) {
			if (error instanceof Error && error.name === 'RenderingCancelledException') {
				return;
			}

			if (generation !== renderGeneration) return;
			renderState = 'error';
			errorMessage = error instanceof Error ? error.message : 'Unable to render this page.';
		} finally {
			if (renderTask === nextTask) {
				renderTask = null;
			}
		}
	}

	async function loadDocument(nextSrc: string) {
		const generation = ++loadGeneration;
		lastLoadedSrc = nextSrc;
		viewerState = 'loading';
		renderState = 'idle';
		errorMessage = '';
		loadProgress = null;
		zoomMultiplier = 1;
		currentZoomPercent = 100;
		paperWidth = 0;
		paperHeight = 0;
		await destroyDocument();

		try {
			const [pdfjs, bytes] = await Promise.all([loadPdfJs(), fetchPdfBytes(nextSrc, generation)]);
			if (generation !== loadGeneration) return;

			const nextTask = pdfjs.getDocument({
				data: bytes,
				useWorkerFetch: false,
				stopAtErrors: true
			});
			loadingTask = nextTask;

			const nextDocument = (await Promise.race([
				nextTask.promise,
				new Promise<never>((_, reject) =>
					window.setTimeout(
						() => reject(new Error('The document took too long to prepare.')),
						15000
					)
				)
			])) as PDFDocumentProxy;

			if (generation !== loadGeneration) {
				await nextDocument.destroy().catch(() => undefined);
				return;
			}

			pdfDoc = nextDocument;
			loadingTask = null;
			pageCount = nextDocument.numPages;
			currentPage = 1;
			syncPageInput();
			seedThumbnails(pageCount);
			queueThumbnailCluster(1);
			warmInitialThumbnails();
			loadProgress = 100;
			viewerState = 'ready';
			queueMicrotask(() => updateViewportWidth());
		} catch (error) {
			if (generation !== loadGeneration) return;
			if (error instanceof Error && error.message === '__stale__') return;
			viewerState = 'error';
			errorMessage =
				error instanceof Error ? error.message : 'Unable to open this document preview.';
		}
	}

	function goToPage(pageNumber: number) {
		const nextPage = clampPage(pageNumber);
		if (nextPage === currentPage) {
			queueThumbnailCluster(nextPage);
			return;
		}

		currentPage = nextPage;
		syncPageInput();
		stageScroller?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
		queueThumbnailCluster(nextPage);
	}

	function stepPage(direction: -1 | 1) {
		goToPage(currentPage + direction);
	}

	function commitPageInput() {
		const parsed = Number(pageInput);
		if (!Number.isFinite(parsed)) {
			syncPageInput();
			return;
		}

		goToPage(parsed);
	}

	function zoomIn() {
		zoomMultiplier = Math.min(3, +(zoomMultiplier + 0.25).toFixed(2));
	}

	function zoomOut() {
		// Floor at 1 — fit-to-width is the smallest sensible zoom.
		zoomMultiplier = Math.max(1, +(zoomMultiplier - 0.25).toFixed(2));
	}

	function fitToWidth() {
		zoomMultiplier = 1;
	}

	async function toggleFullscreen() {
		if (!browser || !viewerRoot || !canFullscreen) return;

		if (document.fullscreenElement === viewerRoot) {
			await document.exitFullscreen().catch(() => undefined);
			return;
		}

		await viewerRoot.requestFullscreen().catch(() => undefined);
	}

	$effect(() => {
		if (!browser || !hasMounted || !src || src === lastLoadedSrc) return;
		scheduleDocumentLoad(src);
	});

	$effect(() => {
		if (
			!browser ||
			!hasMounted ||
			viewerState !== 'ready' ||
			!pdfDoc ||
			!canvas ||
			!pageViewport ||
			!viewportWidth
		) {
			return;
		}

		const document = pdfDoc;
		const targetCanvas = canvas;
		const pageNumber = currentPage;
		const width = viewportWidth;
		const multiplier = zoomMultiplier;

		void renderPage(document, targetCanvas, pageNumber, width, multiplier);
	});

	onMount(() => {
		if (!browser) return;

		hasMounted = true;
		canFullscreen = document.fullscreenEnabled;
		updateViewportWidth();
		scheduleDocumentLoad(src);

		const onFullscreenChange = () => {
			isFullscreen = document.fullscreenElement === viewerRoot;
		};

		document.addEventListener('fullscreenchange', onFullscreenChange);

		if (pageViewport) {
			resizeObserver = new ResizeObserver(() => updateViewportWidth());
			resizeObserver.observe(pageViewport);
		}

		return () => {
			if (pendingLoadFrame) {
				window.cancelAnimationFrame(pendingLoadFrame);
				pendingLoadFrame = 0;
			}
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			resizeObserver?.disconnect();
			resizeObserver = null;
			void destroyDocument();
		};
	});
</script>

<section
	bind:this={viewerRoot}
	class={cn('kb-pdf', isFullscreen && 'kb-pdf--fullscreen', className)}
	aria-label={`Document viewer for ${title}`}
>
	<div class="kb-pdf__toolbar">
		<p class="kb-pdf__sr-status" aria-live="polite">{viewerStatus}</p>

		<div class="kb-pdf__controls">
			<ButtonGroup.Root aria-label="Page navigation">
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Previous page"
					disabled={viewerState !== 'ready' || currentPage <= 1}
					onclick={() => stepPage(-1)}
				>
					<ChevronLeft class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Next page"
					disabled={viewerState !== 'ready' || currentPage >= pageCount}
					onclick={() => stepPage(1)}
				>
					<ChevronRight class="size-4" />
				</Button>
			</ButtonGroup.Root>

			<label class="kb-pdf__page-field" aria-label="Current page">
				<input
					id="toolbox-pdf-page"
					type="number"
					min="1"
					max={pageCount || undefined}
					class="kb-pdf__page-input"
					bind:value={pageInput}
					disabled={viewerState !== 'ready'}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							commitPageInput();
						}
					}}
					onblur={commitPageInput}
				/>
				<span class="kb-pdf__page-total">/ {pageCount || '—'}</span>
			</label>

			<ButtonGroup.Root aria-label="Zoom controls">
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Zoom out"
					disabled={viewerState !== 'ready'}
					onclick={zoomOut}
				>
					<Minus class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					aria-label="Fit to width"
					disabled={viewerState !== 'ready'}
					onclick={fitToWidth}
				>
					{Math.round(currentZoomPercent)}%
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Zoom in"
					disabled={viewerState !== 'ready'}
					onclick={zoomIn}
				>
					<Plus class="size-4" />
				</Button>
			</ButtonGroup.Root>

			<Button
				variant="outline"
				size="icon-sm"
				aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
				disabled={!canFullscreen}
				onclick={toggleFullscreen}
			>
				{#if isFullscreen}
					<Minimize2 class="size-4" />
				{:else}
					<Maximize2 class="size-4" />
				{/if}
			</Button>
		</div>
	</div>

	<div class="kb-pdf__layout" class:has-thumbs={showThumbRail}>
		<div bind:this={stageScroller} class="kb-pdf__stage-scroll">
			<div bind:this={pageViewport} class="kb-pdf__stage">
				{#if viewerState === 'loading'}
					<div class="kb-pdf__state">
						<Spinner class="size-5" />
						<p class="kb-pdf__state-title">
							{loadProgress === null ? 'Loading document' : `Loading document · ${loadProgress}%`}
						</p>
					</div>
				{:else if viewerState === 'error'}
					<div class="kb-pdf__state">
						<p class="kb-pdf__state-title">Preview unavailable</p>
						<p class="kb-pdf__state-text">
							{errorMessage || 'This PDF could not be prepared for inline reading.'}
						</p>
						<Button href={src} target="_blank" rel="noopener" variant="outline" size="sm">
							Open the document directly
						</Button>
					</div>
				{:else}
					<div
						class="kb-pdf__paper"
						style="width: {paperWidth}px; height: {paperHeight}px;"
					>
						<canvas bind:this={canvas} class="kb-pdf__canvas"></canvas>
					</div>
				{/if}
			</div>
		</div>

		{#if showThumbRail}
			<aside class="kb-pdf__thumb-panel" aria-label="Document pages">
				<div class="kb-pdf__thumb-list">
					{#each thumbnails as thumb (thumb.pageNumber)}
						<button
							type="button"
							class="kb-pdf__thumb"
							class:is-active={thumb.pageNumber === currentPage}
							aria-label={`Open page ${thumb.pageNumber}`}
							aria-current={thumb.pageNumber === currentPage ? 'page' : undefined}
							onclick={() => goToPage(thumb.pageNumber)}
							onfocus={() => queueThumbnail(thumb.pageNumber)}
							onpointerenter={() => queueThumbnail(thumb.pageNumber)}
						>
							<div class="kb-pdf__thumb-preview">
								{#if thumb.dataUrl}
									<img
										src={thumb.dataUrl}
										alt=""
										loading="lazy"
										decoding="async"
										class="kb-pdf__thumb-image"
									/>
								{:else if thumb.status === 'loading'}
									<div class="kb-pdf__thumb-spinner">
										<Spinner class="size-4" />
									</div>
								{:else}
									<div class="kb-pdf__thumb-placeholder"></div>
								{/if}
							</div>
							<span class="kb-pdf__thumb-label">{thumb.pageNumber}</span>
						</button>
					{/each}
				</div>
			</aside>
		{/if}
	</div>

	<noscript>
		<div class="kb-pdf__noscript">
			<a href={src} target="_blank" rel="noopener">Open this PDF in a new tab</a>
		</div>
	</noscript>
</section>

<style>
	.kb-pdf {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius, 0.625rem);
		background: var(--card);
		color: var(--card-foreground);
	}

	.kb-pdf--fullscreen {
		border-radius: 0;
		border: 0;
	}

	.kb-pdf__toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
		background: var(--card);
	}

	/* Visually-hidden live region — preserved for screen readers only. */
	.kb-pdf__sr-status {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.kb-pdf__controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	/* Single bordered shell that looks like one input. The actual <input> is
	   borderless inside; the `/ total` suffix is decorative and not editable. */
	.kb-pdf__page-field {
		display: inline-flex;
		align-items: center;
		height: 2rem;
		padding: 0 0.625rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--background);
		font-size: 0.8125rem;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		cursor: text;
	}
	.kb-pdf__page-field:focus-within {
		border-color: var(--ring, var(--foreground));
		box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
	}

	.kb-pdf__page-input {
		width: 1.75rem;
		min-width: 0;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		font: inherit;
		font-weight: 600;
		color: inherit;
		text-align: right;
		font-variant-numeric: tabular-nums;
		appearance: textfield;
		-moz-appearance: textfield;
		outline: none;
	}
	.kb-pdf__page-input::-webkit-outer-spin-button,
	.kb-pdf__page-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.kb-pdf__page-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.kb-pdf__page-total {
		margin-left: 0.2rem;
		color: var(--muted-foreground);
		user-select: none;
	}

	.kb-pdf__layout {
		display: grid;
		gap: 0;
	}

	@media (min-width: 980px) {
		.kb-pdf__layout.has-thumbs {
			grid-template-columns: minmax(0, 1fr) 180px;
			max-height: min(80vh, 900px);
		}
	}

	.kb-pdf__stage-scroll {
		min-width: 0;
		overflow: auto;
		background: var(--muted);
	}

	@media (min-width: 980px) {
		.kb-pdf__stage-scroll {
			min-height: 0;
		}
	}

	.kb-pdf__stage {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-start;
		min-height: 280px;
		padding: 1rem;
		min-width: 0;
	}

	.kb-pdf__state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		max-width: 28rem;
		padding: 2rem 1.5rem;
		text-align: center;
		color: var(--muted-foreground);
	}

	.kb-pdf__state-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.kb-pdf__state-text {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--muted-foreground);
	}

	/* Paper size is set inline from JS (width/height in px) based on the stage's
	   content width and the page's actual PDF aspect ratio. At zoom=1 it fits
	   the column; at zoom>1 it grows wider and the stage scrolls horizontally. */
	.kb-pdf__paper {
		display: block;
		max-width: 100%;
		align-self: center;
		background: #fff;
		border: 1px solid var(--border);
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.04),
			0 8px 24px -8px rgba(15, 23, 42, 0.12);
	}

	/* Canvas fills the aspect-ratio'd paper exactly. JS still rasterizes the
	   bitmap at high resolution for sharpness; CSS uses width/height % so the
	   browser scales the bitmap into the box. */
	.kb-pdf__canvas {
		display: block;
		width: 100% !important;
		height: 100% !important;
		background: #fff;
	}

	.kb-pdf__thumb-panel {
		border-top: 1px solid var(--border);
		background: var(--card);
		min-width: 0;
		min-height: 0;
	}

	@media (min-width: 980px) {
		.kb-pdf__thumb-panel {
			border-top: 0;
			border-left: 1px solid var(--border);
			display: flex;
			flex-direction: column;
			min-height: 0;
		}
	}

	/* Mobile (below 980px): horizontal strip below the page that scrolls when
	   pages overflow. Always starts flush-left with locked item widths. */
	.kb-pdf__thumb-list {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 104px;
		justify-content: start;
		align-content: start;
		gap: 0.75rem;
		padding: 0.75rem;
		overflow-x: auto;
		overflow-y: hidden;
		max-width: 100%;
		min-width: 0;
		scrollbar-width: thin;
	}

	@media (min-width: 980px) {
		.kb-pdf__thumb-list {
			grid-auto-flow: row;
			grid-auto-columns: initial;
			grid-template-columns: 1fr;
			justify-content: stretch;
			align-content: start;
			gap: 0.75rem;
			overflow-x: visible;
			overflow-y: auto;
			flex: 1 1 0;
			min-height: 0;
			max-width: none;
		}
	}

	.kb-pdf__thumb {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0;
		background: transparent;
		border: 0;
		cursor: pointer;
		color: var(--muted-foreground);
		transition: color 0.15s ease;
	}

	.kb-pdf__thumb-preview {
		position: relative;
		width: 100%;
		aspect-ratio: 8.5 / 11;
		overflow: hidden;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: calc(var(--radius, 0.625rem) - 4px);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.kb-pdf__thumb:hover .kb-pdf__thumb-preview,
	.kb-pdf__thumb:focus-visible .kb-pdf__thumb-preview {
		border-color: var(--foreground);
	}

	.kb-pdf__thumb:focus-visible {
		outline: none;
	}

	.kb-pdf__thumb:focus-visible .kb-pdf__thumb-preview {
		box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring, var(--foreground));
	}

	.kb-pdf__thumb.is-active {
		color: var(--foreground);
	}

	.kb-pdf__thumb.is-active .kb-pdf__thumb-preview {
		border-color: var(--foreground);
		box-shadow: 0 0 0 1px var(--foreground);
	}

	.kb-pdf__thumb-placeholder,
	.kb-pdf__thumb-spinner {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		color: var(--muted-foreground);
	}

	.kb-pdf__thumb-image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.kb-pdf__thumb-label {
		font-size: 0.75rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.kb-pdf__thumb:hover,
	.kb-pdf__thumb.is-active {
		color: var(--foreground);
	}

	.kb-pdf__noscript {
		padding: 1rem;
		font-size: 0.875rem;
	}

	.kb-pdf__noscript a {
		color: var(--foreground);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	@media (max-width: 760px) {
		.kb-pdf__toolbar {
			padding: 0.5rem 0.75rem;
		}

		.kb-pdf__controls {
			width: 100%;
			justify-content: space-between;
		}

		.kb-pdf__stage {
			min-height: 240px;
			padding: 0.75rem;
		}
	}
</style>
