<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		detail = '',
		children
	}: {
		title: string;
		detail?: string;
		children?: Snippet;
	} = $props();
</script>

<h1 class="text-2xl font-bold text-slate-900">{title}</h1>
{#if detail}
	<p class="mt-1 text-sm text-slate-500">{detail}</p>
{/if}
<div class="mt-4 grid gap-3">
	{@render children?.()}
</div>
