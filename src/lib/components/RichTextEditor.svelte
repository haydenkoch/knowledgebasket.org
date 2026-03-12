<script lang="ts">
	import { Bold, Italic, List, ListOrdered, Link } from '@lucide/svelte';

	/** Bound value: HTML string. Submitted via hidden input. */
	let {
		value = $bindable(''),
		name = 'description',
		placeholder = 'Write your content…',
		minHeight = '160px',
		/** When set (e.g. form repopulation), editor content is set to this once. */
		initialValue = ''
	} = $props();

	let el: HTMLDivElement;
	let hasAppliedInitial = false;

	function exec(cmd: string, arg?: string) {
		document.execCommand(cmd, false, arg ?? undefined);
		el.focus();
		sync();
	}

	function addLink() {
		const url = prompt('Enter URL:');
		if (url) exec('createLink', url);
	}

	function sync() {
		if (el) value = el.innerHTML;
	}

	function onInput() {
		sync();
	}

	function onPaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
	}

	$effect(() => {
		if (!initialValue) hasAppliedInitial = false;
		else if (el && initialValue && !hasAppliedInitial) {
			hasAppliedInitial = true;
			el.innerHTML = initialValue;
			value = initialValue;
		}
	});
</script>

<div class="kb-rich-editor">
	<div class="kb-rich-toolbar" role="toolbar">
		<button type="button" class="kb-rich-btn" onclick={() => exec('bold')} title="Bold"><Bold class="size-4" /></button>
		<button type="button" class="kb-rich-btn" onclick={() => exec('italic')} title="Italic"><Italic class="size-4" /></button>
		<span class="kb-rich-sep" aria-hidden="true"></span>
		<button type="button" class="kb-rich-btn" onclick={() => exec('insertUnorderedList')} title="Bullet list"><List class="size-4" /></button>
		<button type="button" class="kb-rich-btn" onclick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered class="size-4" /></button>
		<button type="button" class="kb-rich-btn" onclick={addLink} title="Insert link"><Link class="size-4" /></button>
	</div>
	<div
		bind:this={el}
		contenteditable="true"
		role="textbox"
		aria-multiline="true"
		aria-label={placeholder}
		class="kb-rich-body"
		style="min-height: {minHeight}"
		oninput={onInput}
		onpaste={onPaste}
		data-placeholder={placeholder}
	></div>
	<input type="hidden" name={name} value={value} />
</div>

<style>
	.kb-rich-editor {
		border: 1px solid var(--rule);
		border-radius: var(--r);
		overflow: hidden;
		background: #fff;
	}
	.kb-rich-toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--rule);
		background: var(--bone);
	}
	.kb-rich-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--mid);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.kb-rich-btn:hover {
		background: var(--sand);
		color: var(--dark);
	}
	.kb-rich-sep {
		width: 1px;
		height: 20px;
		background: var(--rule);
		margin: 0 4px;
	}
	.kb-rich-body {
		padding: 12px 14px;
		font-family: var(--font-sans);
		font-size: 14px;
		line-height: 1.6;
		color: var(--dark);
		outline: none;
		overflow-y: auto;
	}
	.kb-rich-body:empty::before {
		content: attr(data-placeholder);
		color: var(--muted);
	}
	.kb-rich-body :global(ul),
	.kb-rich-body :global(ol) {
		margin: 0.5em 0;
		padding-left: 1.5em;
	}
	.kb-rich-body :global(p) {
		margin: 0 0 0.5em;
	}
	.kb-rich-body :global(a) {
		color: var(--teal);
		text-decoration: underline;
	}
</style>
