<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Platform audit</h1>
{#if data.events.length === 0}
	<p class="mt-4 text-sm text-stone-600">No audit events yet.</p>
{:else}
	<ul class="mt-4 divide-y rounded-md border border-stone-200 bg-white">
		{#each data.events as event (event.id)}
			<li class="px-4 py-3 text-sm">
				<span class="font-medium">{event.action}</span>
				<span class="text-stone-500">{event.entityType}</span>
				<span class="block text-stone-400">{event.createdAt}</span>
			</li>
		{/each}
	</ul>
{/if}
