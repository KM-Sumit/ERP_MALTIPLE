<script lang="ts">
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PanelPage title="Notices & Events" detail="School news and announcements">
	{#if data.notices.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No notices yet.</p>
	{:else}
		{#each data.notices as notice (notice.id)}
			<article class="rounded-3xl bg-white p-5 shadow-sm">
				<h2 class="font-semibold text-slate-900">{notice.title}</h2>
				<p class="mt-1 text-xs text-slate-400">
					{new Date(notice.createdAt).toLocaleDateString('en-IN', {
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})}
				</p>
				<p class="mt-3 text-sm whitespace-pre-wrap text-slate-700">{notice.body}</p>
			</article>
		{/each}
	{/if}
</PanelPage>
