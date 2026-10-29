<script lang="ts">
	import { resolve } from '$app/paths';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const total = $derived(data.students.length);
	const marked = $derived(data.present + data.absent + data.leave);
	const rate = $derived(total === 0 ? 0 : Math.round((data.present / total) * 1000) / 10);
	const section = $derived(data.sections.find((item) => item.id === data.sectionId) ?? null);
	const presentShare = $derived(marked === 0 ? 0 : (data.present / marked) * 100);
	const absentShare = $derived(marked === 0 ? 0 : presentShare + (data.absent / marked) * 100);
	const ring = $derived(
		marked === 0
			? '#e2e8f0'
			: `conic-gradient(#22c55e 0% ${presentShare}%, #ef4444 ${presentShare}% ${absentShare}%, #f59e0b ${absentShare}% 100%)`
	);
	const classes = $derived([...new Set(data.sections.map((item) => item.className))]);

	function statusClass(status: string) {
		if (status === 'present' || status === 'late') return 'bg-emerald-50 text-emerald-700';
		if (status === 'absent') return 'bg-rose-50 text-rose-700';
		if (status === 'excused') return 'bg-amber-50 text-amber-700';
		return 'bg-slate-100 text-slate-500';
	}
	function label(status: string) {
		if (status === 'late') return 'Present';
		if (status === 'excused') return 'Leave';
		if (!status) return 'Not marked';
		return status[0].toUpperCase() + status.slice(1);
	}
</script>

<RecordPage
	crumb="Dashboard  /  Attendance"
	title="Attendance"
	detail="Track and manage student attendance"
	stats={[
		{ label: 'Total Students', value: String(total), note: section ? `${section.className} · ${section.name}` : 'No section yet', tone: 'bg-[#eef4ff]' },
		{ label: 'Present', value: String(data.present), note: total ? `${Math.round((data.present / total) * 100)}%` : '0%', tone: 'bg-[#e9fbf3]' },
		{ label: 'Absent', value: String(data.absent), note: total ? `${Math.round((data.absent / total) * 100)}%` : '0%', tone: 'bg-[#fff1f2]' },
		{ label: 'Leave', value: String(data.leave), note: total ? `${Math.round((data.leave / total) * 100)}%` : '0%', tone: 'bg-[#fff8e8]' }
	]}
>
	<form class="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3" method="get">
		<label class="text-xs text-slate-500">Class
			<select class="mt-1 block rounded-lg border px-2 py-1.5 text-sm" name="class" onchange={(event) => {
				const name = event.currentTarget.value;
				const match = data.sections.find((item) => item.className === name);
				if (match) location.href = `${resolve('/school/attendance')}?section=${match.id}&date=${data.date}`;
			}}>
				{#each classes as name (name)}
					<option selected={name === section?.className}>{name}</option>
				{/each}
			</select>
		</label>
		<label class="text-xs text-slate-500">Section
			<select class="mt-1 block rounded-lg border px-2 py-1.5 text-sm" name="section">
				{#each data.sections.filter((item) => !section || item.className === section.className) as item (item.id)}
					<option value={item.id} selected={item.id === data.sectionId}>{item.name}</option>
				{/each}
			</select>
		</label>
		<label class="text-xs text-slate-500">Date
			<input class="mt-1 block rounded-lg border px-2 py-1.5 text-sm" name="date" type="date" value={data.date} />
		</label>
		<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Get Attendance</button>
	</form>
	<div class="overflow-x-auto">
		<table class="w-full min-w-[560px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">#</th><th>Roll No.</th><th>Student Name</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each data.students as student, index (student.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3">{index + 1}</td>
						<td>{student.rollNumber || student.admissionNo}</td>
						<td class="font-medium">{student.name}</td>
						<td><span class="rounded-full px-2 py-0.5 text-xs font-semibold {statusClass(student.status)}">{label(student.status)}</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="4">No students in this section.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#snippet side()}
		<div class="flex items-center justify-between">
			<h2 class="font-bold">Attendance Overview</h2>
			<span class="text-xs text-slate-400">{data.date}</span>
		</div>
		<div class="relative mx-auto mt-4 grid h-36 w-36 place-items-center">
			<div class="h-36 w-36 rounded-full" style:background={ring} style:mask="radial-gradient(farthest-side, transparent 58%, #000 59%)" style:-webkit-mask="radial-gradient(farthest-side, transparent 58%, #000 59%)"></div>
			<div class="absolute text-center">
				<strong class="block text-xl text-emerald-600">{rate}%</strong>
				<span class="text-xs text-slate-500">Present</span>
			</div>
		</div>
		<ul class="mt-4 space-y-1 text-sm">
			<li class="flex justify-between"><span>Present</span><strong>{data.present}</strong></li>
			<li class="flex justify-between"><span>Absent</span><strong>{data.absent}</strong></li>
			<li class="flex justify-between"><span>Leave</span><strong>{data.leave}</strong></li>
			<li class="flex justify-between"><span>Total</span><strong>{total}</strong></li>
		</ul>
		<h3 class="mt-5 font-semibold">Last 7 days</h3>
		{#if data.trend.length === 0}
			<p class="mt-2 text-sm text-slate-500">No attendance marked in this range.</p>
		{:else}
			<ul class="mt-2 space-y-2">
				{#each data.trend as point (point.day)}
					<li class="flex items-center gap-2 text-xs">
						<span class="w-6">{point.day}</span>
						<span class="h-2 flex-1 rounded-full bg-slate-100"><span class="block h-2 rounded-full bg-blue-500" style:width="{point.rate}%"></span></span>
						<span>{point.rate}%</span>
					</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</RecordPage>
