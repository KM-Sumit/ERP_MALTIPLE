<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">School audit</h1>
{#if data.events.length === 0}
	<p class="mt-4 text-sm text-stone-600">No audit events for this school.</p>
{:else}
	<ul class="mt-4 divide-y rounded-md border bg-white">
		{#each data.events as event (event.id)}
			<li class="px-4 py-3 text-sm">{event.action} · {event.entityType}</li>
		{/each}
	</ul>
{/if}
