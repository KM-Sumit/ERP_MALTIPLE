<script lang="ts">
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PanelPage title="Exams & Results" detail="Published report cards">
	<div class="overflow-x-auto rounded-2xl bg-white shadow-sm">
		<table class="w-full min-w-[640px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">Exam</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Remarks</th></tr>
			</thead>
			<tbody>
				{#each data.cards as card (card.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3 font-medium">{card.exam ?? 'Exam'}</td>
						<td>{card.totalMarks ?? '—'} / {card.maxMarks ?? '—'}</td>
						<td>{card.percentage ?? '—'}%</td>
						<td><span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{card.grade ?? '—'}</span></td>
						<td>{card.remarks || '—'}</td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="5">Published results will appear here.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</PanelPage>
