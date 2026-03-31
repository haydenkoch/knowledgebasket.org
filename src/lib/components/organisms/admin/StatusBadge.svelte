<script lang="ts">
	let { status = 'unknown' }: { status?: string } = $props();

	const variants: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		published: 'bg-green-100 text-green-800 border-green-200',
		rejected: 'bg-red-100 text-red-800 border-red-200',
		cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
		draft: 'bg-blue-100 text-blue-800 border-blue-200',
		closed: 'bg-gray-100 text-gray-600 border-gray-200',
		unknown: 'bg-gray-100 text-gray-500 border-gray-200'
	};

	const labels: Record<string, string> = {
		pending: 'Pending',
		published: 'Published',
		rejected: 'Rejected',
		cancelled: 'Cancelled',
		draft: 'Draft',
		closed: 'Closed',
		unknown: 'Unknown'
	};

	const classes = $derived(variants[status] ?? variants.unknown);
	const label = $derived(labels[status] ?? status);
</script>

<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium {classes}">
	{label}
</span>
