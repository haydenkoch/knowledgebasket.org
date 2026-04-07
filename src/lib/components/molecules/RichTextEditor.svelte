<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor as TinyMCEEditor, TinyMCE } from 'tinymce';

	interface Props {
		value?: string;
		name?: string;
		placeholder?: string;
		minHeight?: string;
		initialValue?: string;
		mode?: 'rich' | 'plain';
	}

	let {
		value = $bindable(''),
		name = 'body',
		placeholder = 'Write here...',
		minHeight = '220px',
		initialValue = '',
		mode = 'rich'
	}: Props = $props();

	let container = $state<HTMLDivElement | undefined>(undefined);
	let editor: TinyMCEEditor | undefined;

	$effect(() => {
		if (mode === 'plain' && !value && initialValue) {
			value = initialValue;
		}
	});

	onMount(async () => {
		if (mode === 'plain') return;
		const content = initialValue || value || '';
		try {
			const { default: tinymce } = (await import('tinymce/tinymce')) as { default: TinyMCE };
			await Promise.all([
				import('tinymce/themes/silver'),
				import('tinymce/plugins/autolink'),
				import('tinymce/plugins/link'),
				import('tinymce/plugins/lists'),
				import('tinymce/plugins/image'),
				import('tinymce/plugins/code'),
				import('tinymce/icons/default')
			]);
			const [inst] = await tinymce.init({
				target: container,
				height: minHeight,
				menubar: false,
				skin_url: '/tinymce/skins/ui/oxide',
				content_css: '/tinymce/skins/content/default/content.css',
				plugins: 'autolink link lists image code',
				block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3',
				toolbar: 'blocks | bold italic | bullist numlist | link unlink | removeformat | code',
				placeholder,
				setup(ed: TinyMCEEditor) {
					ed.on('input Change', () => {
						value = ed.getContent();
					});
				}
			});
			editor = inst;
			if (content) inst.setContent(content);
		} catch {
			// TinyMCE not available — fall back to plain textarea
		}
	});

	onDestroy(() => {
		editor?.remove();
	});
</script>

<div>
	{#if mode === 'plain'}
		<textarea
			{name}
			bind:value
			{placeholder}
			style:min-height={minHeight}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
		></textarea>
	{:else}
		<div bind:this={container}></div>
		<input type="hidden" {name} {value} />
	{/if}
</div>
