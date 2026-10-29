<script lang="ts">
	import { resolve } from '$app/paths';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PanelPage title="Homework & Assignments" detail="Notes and work uploaded for your class">
	{#if data.items.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No notes yet.</p>
	{:else}
		<ul class="grid gap-2">
			{#each data.items as item (item.id)}
				<li class="rounded-3xl bg-white p-4 shadow-sm">
					<p class="font-semibold text-slate-900">{item.title}</p>
					<p class="text-sm text-slate-500">{item.course}</p>
					{#if item.fileId}
						<a class="mt-2 inline-block text-sm font-semibold text-teal-800" href={resolve('/family/files/[id]', { id: item.fileId })}>
							Open note
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</PanelPage>
