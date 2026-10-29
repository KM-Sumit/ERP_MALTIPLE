<script lang="ts">
	import { resolve } from '$app/paths';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PanelPage
	title="Study Material"
	detail={data.placement ? `Uploaded for class ${data.placement.className}` : 'Courses for your class'}
>
	{#if data.items.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
			No course has been uploaded for this class yet.
		</p>
	{:else}
		<ul class="grid gap-2">
			{#each data.items as item (item.id)}
				<li class="rounded-3xl bg-white p-4 shadow-sm">
					<p class="text-xs font-semibold tracking-wide text-emerald-700 uppercase">{item.kind}</p>
					<p class="mt-1 font-semibold text-slate-900">{item.title}</p>
					<p class="text-sm text-slate-500">{item.course}</p>
					{#if item.fileId}
						<a
							class="mt-3 inline-block rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
							href={resolve('/family/files/[id]', { id: item.fileId })}
						>
							Open course
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</PanelPage>
