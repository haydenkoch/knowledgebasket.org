<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		name: string;
		accept?: string;
		maxSizeMb?: number;
		label?: string;
		hint?: string;
	}

	let {
		name,
		accept = 'image/jpeg,image/png,image/webp',
		maxSizeMb = 5,
		label = 'Drop image here or click to upload',
		hint = 'JPG, PNG, or WebP · max 5 MB'
	}: Props = $props();

	const inputId = `dropzone-${Math.random().toString(36).slice(2)}`;
	let file = $state<File | null>(null);
	let dragOver = $state(false);
	let sizeError = $state('');

	function handleFile(f: File | null) {
		if (!f) return;
		if (f.size > maxSizeMb * 1024 * 1024) {
			sizeError = `File must be ${maxSizeMb} MB or smaller.`;
			file = null;
			return;
		}
		sizeError = '';
		file = f;
	}

	function onchange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		handleFile(input.files?.[0] ?? null);
	}

	function ondrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const dropped = e.dataTransfer?.files?.[0] ?? null;
		if (dropped) {
			handleFile(dropped);
			// Sync to the hidden input via DataTransfer
			const input = document.getElementById(inputId) as HTMLInputElement | null;
			if (input) {
				const dt = new DataTransfer();
				dt.items.add(dropped);
				input.files = dt.files;
			}
		}
	}

	function clear() {
		file = null;
		sizeError = '';
		const input = document.getElementById(inputId) as HTMLInputElement | null;
		if (input) input.value = '';
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div>
	{#if file}
		<div
			class="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
		>
			<div class="flex min-w-0 items-center gap-3">
				<UploadIcon class="size-4 shrink-0 text-muted-foreground" />
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-foreground">{file.name}</p>
					<p class="text-xs text-muted-foreground">{formatSize(file.size)}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={clear}
				class="ml-3 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Remove file"
			>
				<XIcon class="size-4" />
			</button>
		</div>
	{:else}
		<label
			for={inputId}
			class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--border)] px-6 py-8 transition-colors hover:border-[var(--kb-accent,var(--border))]"
			class:border-[var(--kb-accent)]={dragOver}
			class:bg-muted={dragOver}
			ondragover={(e) => {
				e.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => {
				dragOver = false;
			}}
			{ondrop}
		>
			<UploadIcon class="size-6 text-muted-foreground" />
			<div class="text-center">
				<p class="text-sm font-medium text-foreground">{label}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">{hint}</p>
			</div>
		</label>
	{/if}

	<input id={inputId} {name} type="file" {accept} class="sr-only" {onchange} />

	{#if sizeError}
		<p class="mt-1.5 text-xs text-destructive">{sizeError}</p>
	{/if}
</div>
