<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		name,
		type = 'text',
		value = '',
		required = false,
		...rest
	}: {
		label: string;
		name: string;
		type?: HTMLInputAttributes['type'];
		value?: string | number;
		required?: boolean;
	} & HTMLInputAttributes = $props();
</script>

<label class="grid gap-1 text-sm">
	<span class="font-medium text-stone-700">{label}</span>
	<input
		class="rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900"
		{name}
		{type}
		{value}
		{required}
		{...rest}
	/>
</label>
