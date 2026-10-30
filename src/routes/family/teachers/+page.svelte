<script lang="ts">
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function clock(value: string | null) {
		return value ? value.slice(0, 5) : '';
	}
</script>

<PanelPage title="Teacher report" detail="Class teacher for your section">
	{#if data.teachers.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No class teacher is assigned yet.</p>
	{:else}
		{#each data.teachers as teacher (teacher.id)}
			<article class="rounded-3xl bg-white p-5 shadow-sm">
				<h2 class="font-semibold text-slate-900">{teacher.name}</h2>
				{#if teacher.email}
					<p class="mt-1 text-sm text-slate-500">{teacher.email}</p>
				{/if}
				{#if teacher.attendanceTime}
					<p class="mt-2 text-sm text-slate-600">Attendance time {clock(teacher.attendanceTime)}</p>
				{/if}
			</article>
		{/each}
	{/if}
</PanelPage>
