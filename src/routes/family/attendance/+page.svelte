<script lang="ts">
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const totals = $derived.by(() => {
		const count = { present: 0, absent: 0, late: 0, excused: 0 };
		for (const row of data.rows) {
			if (row.status in count) count[row.status as keyof typeof count] += 1;
		}
		const marked = data.rows.length;
		const attended = count.present + count.late;
		return {
			...count,
			marked,
			rate: marked === 0 ? 0 : Math.round((attended / marked) * 100)
		};
	});
	const months = $derived.by(() => {
		const keys = [...new Set(data.rows.map((row) => String(row.date).slice(0, 7)))];
		return keys.map((key) => ({
			key,
			label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
				Date.parse(`${key}-01T00:00:00`)
			),
			rows: data.rows.filter((row) => String(row.date).slice(0, 7) === key)
		}));
	});

	const calendar = $derived.by(() => {
		const shifted = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
		const year = shifted.getUTCFullYear();
		const month = shifted.getUTCMonth();
		const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
		const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		const cells: { day: number; status: string }[] = [];
		for (let index = 0; index < first; index += 1) cells.push({ day: 0, status: '' });
		for (let day = 1; day <= count; day += 1) {
			const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const row = data.rows.find((item) => String(item.date).slice(0, 10) === key);
			cells.push({ day, status: row?.status ?? '' });
		}
		return {
			label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
				Date.UTC(year, month, 1)
			),
			cells
		};
	});

	function tone(status: string) {
		if (status === 'present') return 'bg-emerald-50 text-emerald-800';
		if (status === 'absent') return 'bg-rose-50 text-rose-800';
		if (status === 'late') return 'bg-amber-50 text-amber-800';
		return 'bg-sky-50 text-sky-800';
	}
</script>

<PanelPage
	title="My Attendance"
	detail={data.placement
		? `Class ${data.placement.className} · ${data.placement.sessionName}`
		: 'Full attendance, grouped by month.'}
>
	<section class="grid gap-3 sm:grid-cols-4">
		{#each [{ label: 'Total marked', value: totals.marked, tone: 'bg-[#eef4ff]' }, { label: 'Present', value: totals.present, tone: 'bg-[#e9fbf3]' }, { label: 'Absent', value: totals.absent, tone: 'bg-[#fff1f2]' }, { label: 'Leave', value: totals.excused, tone: 'bg-[#fff8e8]' }] as item (item.label)}
			<article class="rounded-2xl p-4 {item.tone}">
				<p class="text-xs text-slate-500">{item.label}</p>
				<p class="text-2xl font-bold">{item.value}</p>
			</article>
		{/each}
	</section>
	<section class="rounded-2xl bg-white p-5 shadow-sm">
		<h2 class="font-bold">{calendar.label}</h2>
		<div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
			{#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as day, index (`${day}${index}`)}
				<span class="text-slate-400">{day}</span>
			{/each}
			{#each calendar.cells as cell, index (`${cell.day}-${index}`)}
				<span class="grid h-9 place-items-center rounded-lg {cell.day === 0 ? '' : cell.status === 'present' || cell.status === 'late' ? 'bg-emerald-100 text-emerald-800' : cell.status === 'absent' ? 'bg-rose-100 text-rose-700' : cell.status === 'excused' ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-600'}">{cell.day || ''}</span>
			{/each}
		</div>
		<p class="mt-3 text-sm text-slate-500">{totals.rate}% present across {totals.marked} marked days.</p>
	</section>
	{#if data.rows.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No attendance has been recorded.</p>
	{:else}
		{#each months as month (month.key)}
			<section class="rounded-3xl bg-white p-4 shadow-sm">
				<h2 class="font-semibold text-slate-900">{month.label}</h2>
				<ul class="mt-3 grid gap-2">
					{#each month.rows as row (row.id)}
						<li class="flex items-center justify-between rounded-2xl px-3 py-2 text-sm {tone(row.status)}">
							<span>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</span>
							<span class="font-semibold capitalize">{row.status}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</PanelPage>
