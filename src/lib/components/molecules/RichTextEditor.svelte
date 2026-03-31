<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		value?: string;
		name?: string;
		placeholder?: string;
		minHeight?: string;
		initialValue?: string;
	}

	let { value = $bindable(''), name = 'body', placeholder = 'Write here...', minHeight = '220px', initialValue = '' }: Props = $props();

	let container: HTMLDivElement;
	let editorId = `rte-${Math.random().toString(36).slice(2)}`;
	let editor: unknown;

	onMount(async () => {
		const content = initialValue || value || '';
		try {
			const { default: tinymce } = await import('tinymce/tinymce');
			await Promise.all([
				import('tinymce/themes/silver'),
				import('tinymce/plugins/autolink'),
				import('tinymce/plugins/link'),
				import('tinymce/plugins/lists'),
				import('tinymce/plugins/image'),
				import('tinymce/plugins/code'),
				import('tinymce/icons/default')
			]);
			const [inst] = await (tinymce as any).init({
				target: container,
				height: minHeight,
				menubar: false,
				skin_url: '/tinymce/skins/ui/oxide',
				content_css: '/tinymce/skins/content/default/content.css',
				plugins: 'autolink link lists image code',
				toolbar: 'bold italic | bullist numlist | link | code',
				placeholder,
				setup(ed: any) {
					ed.on('input Change', () => { value = ed.getContent(); });
				}
			});
			editor = inst;
			if (content) (inst as any)?.setContent(content);
		} catch {
			// TinyMCE not available — fall back to plain textarea
		}
	});

	onDestroy(() => {
		if (editor) (editor as any).remove?.();
	});
</script>

<div>
	<div bind:this={container}></div>
	<input type="hidden" {name} {value} />
</div>
