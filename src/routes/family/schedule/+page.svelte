<script lang="ts">
	import { resolve } from '$app/paths';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const days = [
		{ index: 1, label: 'Monday' },
		{ index: 2, label: 'Tuesday' },
		{ index: 3, label: 'Wednesday' },
		{ index: 4, label: 'Thursday' },
		{ index: 5, label: 'Friday' },
		{ index: 6, label: 'Saturday' }
	];
	const colors = ['bg-blue-100', 'bg-emerald-100', 'bg-amber-100', 'bg-violet-100', 'bg-rose-100', 'bg-cyan-100'];
	const slots = $derived([...new Set(data.week.map((row) => `${row.start}|${row.period}`))]);

	function clock(value: string) {
		return value.slice(0, 5);
	}
	function at(weekday: number, slot: string) {
		return data.week.find((row) => row.weekday === weekday && `${row.start}|${row.period}` === slot);
	}
</script>

<PanelPage title="My Timetable" detail={data.placement ? `Class ${data.placement.className} · ${data.placement.sectionName}` : 'Your class schedule'}>
	<div class="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm">
		<table class="w-full min-w-[760px] border-separate border-spacing-1 text-center text-xs">
			<thead>
				<tr>
					<th class="text-slate-400">Time</th>
					{#each days as day (day.index)}<th class="text-slate-500">{day.label}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each slots as slot (slot)}
					<tr>
						<th class="rounded-lg bg-slate-50 px-2 py-3 text-slate-500">{clock(slot.split('|')[0])}<br />{slot.split('|')[1]}</th>
						{#each days as day, index (day.index)}
							{@const entry = at(day.index, slot)}
							<td class="rounded-lg px-1 py-3 {entry ? colors[index % colors.length] : 'bg-slate-50 text-slate-300'}">
								{#if entry}
									<p class="font-semibold text-slate-800">{entry.subject}</p>
									<p class="text-[10px]">{clock(entry.start)}–{clock(entry.end)}</p>
								{:else}
									—
								{/if}
							</td>
						{/each}
					</tr>
				{:else}
					<tr><td class="py-8 text-slate-500" colspan="7">No published timetable for this class yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#each data.files as file (file.fileId)}
		<a class="text-sm font-semibold text-blue-700" href={resolve('/family/files/[id]', { id: file.fileId })}>Open uploaded timetable</a>
	{/each}
</PanelPage>
