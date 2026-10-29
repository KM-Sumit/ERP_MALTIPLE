<script lang="ts">
	import QuickGrid from '#lib/components/QuickGrid.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function pick(hrefs: string[]) {
		return hrefs.flatMap((href) => data.links.filter((link) => link.href === href));
	}

	const academic = $derived(
		pick([
			'/school/academic',
			'/school/timetable',
			'/school/exams',
			'/school/courses',
			'/school/staff',
			'/school/people'
		])
	);
	const services = $derived(
		pick([
			'/school/profile',
			'/school/notices',
			'/school/fees',
			'/school/complaints',
			'/school/documents',
			'/school/reports'
		])
	);
</script>

<div class="grid gap-4">
	{#if data.school}
		<p class="text-center text-sm font-semibold tracking-wide text-slate-800 uppercase">
			{data.school.name}
		</p>
	{/if}
	<QuickGrid title="Academic" items={academic} />
	<QuickGrid title="Services" items={services} />
	<section class="rounded-2xl bg-white p-4 shadow-sm">
		<h2 class="text-lg font-semibold text-slate-900">Notices</h2>
		{#if data.notices.length === 0}
			<p class="mt-2 text-sm text-slate-500">No notices yet.</p>
		{:else}
			<ul class="mt-3 grid gap-2">
				{#each data.notices as notice (notice.id)}
					<li class="rounded-xl bg-slate-50 px-3 py-2">
						<p class="font-medium text-slate-900">{notice.title}</p>
						<p class="text-sm text-slate-600">{notice.body}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
