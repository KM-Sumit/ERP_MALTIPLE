<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const name = $derived(data.selected ? `${data.selected.firstName} ${data.selected.lastName}` : 'Student');
	const q = $derived(data.selected ? `?student=${data.selected.id}` : '');
	const marked = $derived(data.attendance.length);
	const present = $derived(data.attendance.filter((row) => row.status === 'present' || row.status === 'late').length);
	const rate = $derived(marked === 0 ? 0 : Math.round((present / marked) * 100));
	const pending = $derived(data.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.balance), 0));
	const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

	function clock(value: string) {
		return value.slice(0, 5);
	}
</script>

<div class="space-y-4">
	<div>
		<h1 class="text-2xl font-bold text-slate-900">Welcome Back, {name.split(' ')[0]}!</h1>
		<p class="text-sm text-slate-500">
			{#if data.placement}
				Class {data.placement.className} · {data.placement.sectionName}
				{#if data.placement.rollNumber}· Roll No. {data.placement.rollNumber}{/if}
				· {data.placement.sessionName}
			{:else}
				No class is assigned yet.
			{/if}
		</p>
	</div>
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		<a class="rounded-2xl bg-[#eef4ff] p-4" href={`${resolve('/family/attendance')}${q}`}>
			<p class="text-xs text-slate-500">Attendance</p>
			<p class="text-2xl font-bold">{rate}%</p>
			<p class="text-xs text-emerald-600">{marked} days marked</p>
		</a>
		<a class="rounded-2xl bg-[#fff1f2] p-4" href={`${resolve('/family/fees')}${q}`}>
			<p class="text-xs text-slate-500">Pending Fees</p>
			<p class="text-2xl font-bold">{money.format(pending)}</p>
			<p class="text-xs text-slate-500">{data.invoices.length} invoices</p>
		</a>
		<a class="rounded-2xl bg-[#e9fbf3] p-4" href={`${resolve('/family/result')}${q}`}>
			<p class="text-xs text-slate-500">Total Exams</p>
			<p class="text-2xl font-bold">{data.exams}</p>
			<p class="text-xs text-slate-500">Published results</p>
		</a>
		<a class="rounded-2xl bg-[#fff8e8] p-4" href={`${resolve('/family/notes')}${q}`}>
			<p class="text-xs text-slate-500">Homework & Notes</p>
			<p class="text-2xl font-bold">{data.notes}</p>
			<p class="text-xs text-slate-500">Uploaded for your class</p>
		</a>
	</section>
	<section class="grid gap-4 xl:grid-cols-2">
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Recent Announcements</h2>
				<a class="text-xs font-semibold text-blue-600" href={`${resolve('/family/notice')}${q}`}>View All</a>
			</div>
			<ul class="mt-3 divide-y divide-slate-100">
				{#each data.notices as notice (notice.id)}
					<li class="py-3">
						<p class="font-semibold">{notice.title}</p>
						<p class="line-clamp-2 text-sm text-slate-500">{notice.body}</p>
					</li>
				{:else}
					<li class="py-6 text-sm text-slate-500">No announcements yet.</li>
				{/each}
			</ul>
		</article>
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Today's Timetable</h2>
				<a class="text-xs font-semibold text-blue-600" href={`${resolve('/family/schedule')}${q}`}>View Full</a>
			</div>
			<p class="mt-1 text-xs text-slate-400">{data.dayName}</p>
			<ul class="mt-3 space-y-3">
				{#each data.periods as period (period.id)}
					<li class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
						<span>
							<span class="block font-semibold">{period.subject}</span>
							<span class="text-xs text-slate-500">{period.period}</span>
						</span>
						<span class="text-sm text-slate-500">{clock(period.start)} – {clock(period.end)}</span>
					</li>
				{:else}
					<li class="py-6 text-sm text-slate-500">No class is published for today.</li>
				{/each}
			</ul>
		</article>
	</section>
</div>
