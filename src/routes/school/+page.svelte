<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const firstName = $derived(data.fullName?.split(' ')[0] || 'Admin');
	const money = new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0
	});
	const feeGoal = $derived(Math.max(data.billedRupees, data.collectedRupees, 1));
	const feePercent = $derived(Math.min(100, Math.round((data.collectedRupees / feeGoal) * 100)));
	const colors = ['#34d399', '#2dd4bf', '#a78bfa', '#fbbf24', '#fb923c', '#f87171', '#60a5fa', '#818cf8'];
	const strengthTotal = $derived(data.strength.reduce((sum, row) => sum + row.students, 0));
	const slices = $derived(
		data.strength.reduce<{ name: string; students: number; color: string; start: number; end: number }[]>(
			(list, row, index) => {
				const total = strengthTotal || 1;
				const start = list.at(-1)?.end ?? 0;
				const end = start + (row.students / total) * 100;
				list.push({
					name: row.name,
					students: row.students,
					color: colors[index % colors.length],
					start,
					end
				});
				return list;
			},
			[]
		)
	);
	const strengthGradient = $derived(
		slices.length === 0
			? '#e2e8f0'
			: `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(', ')})`
	);
	const marked = $derived(data.today.present + data.today.absent + data.today.leave);
	const todayGradient = $derived.by(() => {
		if (marked === 0) return '#e2e8f0';
		const present = (data.today.present / marked) * 100;
		const absent = present + (data.today.absent / marked) * 100;
		return `conic-gradient(#22c55e 0% ${present}%, #ef4444 ${present}% ${absent}%, #f59e0b ${absent}% 100%)`;
	});
	const feeMax = $derived(Math.max(...data.trend.map((row) => row.feesLakhs), 1));

	function chartX(index: number) {
		return 40 + index * (data.trend.length <= 1 ? 0 : 430 / (data.trend.length - 1));
	}
	function lineY(value: number) {
		return 168 - (Math.max(0, Math.min(100, value)) / 100) * 140;
	}
	function points(kind: 'attendance' | 'exam') {
		return data.trend.map((row, index) => `${chartX(index)},${lineY(row[kind])}`).join(' ');
	}
	function activityLabel(action: string) {
		const text = action.replaceAll('.', ' ').replaceAll('_', ' ');
		return text.charAt(0).toUpperCase() + text.slice(1);
	}
	function clock(value: string) {
		const time = Date.parse(value);
		if (Number.isNaN(time)) return '';
		const offset = (5 * 60 + 30) * 60 * 1000;
		const start = Math.floor((Date.now() + offset) / 86_400_000) * 86_400_000 - offset;
		if (time >= start) {
			return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(time);
		}
		if (time >= start - 86_400_000) return 'Yesterday';
		return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(time);
	}
	function eventParts(value: string) {
		const time = Date.parse(value);
		if (Number.isNaN(time)) return { day: '--', month: '', time: '' };
		return {
			day: new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(time),
			month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(time),
			time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(time)
		};
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Welcome Back, {firstName}!</h1>
			<p class="text-sm text-slate-500">Here's an overview of your school today.</p>
		</div>
		<label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
			<span class="text-slate-400">
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/></svg>
			</span>
			<select
				class="bg-transparent font-semibold outline-none"
				value={data.sessionId ?? ''}
				onchange={(event) => {
					const session = event.currentTarget.value;
					goto(session ? `${resolve('/school')}?session=${session}` : resolve('/school'));
				}}
			>
				{#each data.sessions as session (session.id)}
					<option value={session.id}>{session.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		<article class="rounded-2xl bg-[#eef4ff] p-4">
			<div class="flex items-center gap-3">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-[#dbe7ff] text-[#2f6bff]">
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="2.2"/><circle cx="16" cy="9" r="1.7"/><path d="M4.5 18v-1a3 3 0 0 1 3-3H11a3 3 0 0 1 3 3v1"/></svg>
				</span>
				<div>
					<p class="text-xs text-slate-500">Total Students</p>
					<p class="text-2xl font-bold">{data.students.toLocaleString('en-IN')}</p>
				</div>
			</div>
			<p class="mt-3 text-xs font-semibold text-emerald-600">+{data.studentDelta} this month</p>
		</article>
		<article class="rounded-2xl bg-[#e9fbf3] p-4">
			<div class="flex items-center gap-3">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-[#d3f6e6] text-emerald-600">
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="2.4"/><path d="M7 19v-1.2A3.8 3.8 0 0 1 10.8 14h2.4A3.8 3.8 0 0 1 17 17.8V19"/></svg>
				</span>
				<div>
					<p class="text-xs text-slate-500">Total Teachers</p>
					<p class="text-2xl font-bold">{data.teachers.toLocaleString('en-IN')}</p>
				</div>
			</div>
			<p class="mt-3 text-xs font-semibold text-emerald-600">+{data.teacherDelta} this month</p>
		</article>
		<article class="rounded-2xl bg-[#f3eefe] p-4">
			<div class="flex items-center gap-3">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-[#e4d9fb] text-violet-600">
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 6V5h8v1"/></svg>
				</span>
				<div>
					<p class="text-xs text-slate-500">Total Classes</p>
					<p class="text-2xl font-bold">{data.classes.toLocaleString('en-IN')}</p>
				</div>
			</div>
			<p class="mt-3 text-xs text-slate-500">{data.classDelta === 0 ? 'No change' : `+${data.classDelta} this month`}</p>
		</article>
		<article class="rounded-2xl bg-[#fff8e8] p-4">
			<div class="flex items-center gap-3">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-[#ffe8bf] text-amber-600">
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="3"/><path d="M7 19c.6-2.4 2.5-4 5-4s4.4 1.6 5 4"/></svg>
				</span>
				<div>
					<p class="text-xs text-slate-500">Today's Attendance</p>
					<p class="text-2xl font-bold">{data.attendanceRate}%</p>
				</div>
			</div>
			<p class="mt-3 text-xs font-semibold text-emerald-600">{data.today.marked} marked today</p>
		</article>
		<article class="rounded-2xl bg-[#e9fbf3] p-4">
			<div class="flex items-center gap-3">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-[#d3f6e6] text-emerald-600">
					<span class="text-lg font-bold">₹</span>
				</span>
				<div>
					<p class="text-xs text-slate-500">Fees Collected</p>
					<p class="text-2xl font-bold">{money.format(data.collectedRupees)}</p>
				</div>
			</div>
			<p class="mt-3 text-xs font-semibold text-emerald-600">+{money.format(data.monthCollectedRupees)} this month</p>
		</article>
	</section>

	<section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-bold">School Performance Overview</h2>
				<span class="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500">Last 6 Months</span>
			</div>
			<div class="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
				<span class="inline-flex items-center gap-1"><i class="h-2 w-2 rounded-full bg-blue-500"></i> Attendance (%)</span>
				<span class="inline-flex items-center gap-1"><i class="h-2 w-2 rounded-full bg-emerald-500"></i> Exam Average (%)</span>
				<span class="inline-flex items-center gap-1"><i class="h-2 w-2 rounded-full bg-violet-300"></i> Fee Collection (₹ Lakhs)</span>
			</div>
			<svg viewBox="0 0 520 200" class="mt-2 h-56 w-full" role="img" aria-label="School performance for the last six months">
				{#each [0, 25, 50, 75, 100] as tick (tick)}
					<line x1="36" x2="490" y1={lineY(tick)} y2={lineY(tick)} stroke="#e8eef6" />
					<text x="4" y={lineY(tick) + 4} class="fill-slate-400 text-[10px]">{tick}</text>
				{/each}
				{#each data.trend as row, index (row.label)}
					<rect
						x={chartX(index) - 10}
						y={168 - (row.feesLakhs / feeMax) * 140}
						width="20"
						height={(row.feesLakhs / feeMax) * 140}
						rx="4"
						fill="#ddd6fe"
					/>
					<text x={chartX(index)} y="188" text-anchor="middle" class="fill-slate-400 text-[11px]">{row.label}</text>
				{/each}
				<polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points={points('attendance')} />
				<polyline fill="none" stroke="#22c55e" stroke-width="2.5" points={points('exam')} />
				{#each data.trend as row, index (row.label)}
					<circle cx={chartX(index)} cy={lineY(row.attendance)} r="3.5" fill="#3b82f6" />
					<circle cx={chartX(index)} cy={lineY(row.exam)} r="3.5" fill="#22c55e" />
				{/each}
			</svg>
		</article>

		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Student Strength by Class</h2>
			<div class="mt-4 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
				<div class="relative mx-auto grid h-40 w-40 place-items-center">
					<div
						class="h-40 w-40 rounded-full"
						style:background={strengthGradient}
						style:mask="radial-gradient(farthest-side, transparent 62%, #000 63%)"
						style:-webkit-mask="radial-gradient(farthest-side, transparent 62%, #000 63%)"
					></div>
					<div class="absolute grid h-24 w-24 place-items-center text-center">
						<span>
							<strong class="block text-xl">{(strengthTotal || data.students).toLocaleString('en-IN')}</strong>
							<span class="text-xs text-slate-500">Students</span>
						</span>
					</div>
				</div>
				<ul class="space-y-2 text-sm">
					{#each slices as slice (slice.name)}
						<li class="flex items-center justify-between gap-3">
							<span class="inline-flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full" style:background={slice.color}></i>{slice.name}</span>
							<span class="font-semibold">{slice.students}</span>
						</li>
					{:else}
						<li class="text-slate-500">No classes in {data.sessionName} yet.</li>
					{/each}
				</ul>
			</div>
		</article>
	</section>

	<section class="grid gap-4 xl:grid-cols-3">
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Recent Activities</h2>
				<a class="text-xs font-semibold text-blue-600" href={resolve('/school/audit')}>View All</a>
			</div>
			<ul class="mt-3 divide-y divide-slate-100">
				{#each data.activity as item, index (item.at + item.action + index)}
					<li class="flex items-center gap-3 py-3">
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full {index % 2 === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}">
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="2.2"/><path d="M7 18v-.8A3.2 3.2 0 0 1 10.2 14h3.6A3.2 3.2 0 0 1 17 17.2V18"/></svg>
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">{activityLabel(item.action)}</span>
							<span class="block truncate text-xs text-slate-500">{item.entity.replaceAll('_', ' ')}</span>
						</span>
						<span class="text-xs text-slate-400">{clock(item.at)}</span>
					</li>
				{:else}
					<li class="py-6 text-sm text-slate-500">No activity yet.</li>
				{/each}
			</ul>
		</article>

		<article id="attendance" class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Today's Attendance</h2>
				<a class="text-xs font-semibold text-blue-600" href={resolve('/school/academic')}>View All</a>
			</div>
			<div class="mt-4 flex items-center justify-center gap-6">
				<div class="relative grid h-36 w-36 place-items-center">
					<div
						class="h-36 w-36 rounded-full"
						style:background={todayGradient}
						style:mask="radial-gradient(farthest-side, transparent 58%, #000 59%)"
						style:-webkit-mask="radial-gradient(farthest-side, transparent 58%, #000 59%)"
					></div>
					<div class="absolute grid h-20 w-20 place-items-center text-center">
						<span>
							<strong class="block text-2xl text-emerald-600">{data.attendanceRate}%</strong>
							<span class="text-xs text-slate-500">Present</span>
						</span>
					</div>
				</div>
				<ul class="space-y-2 text-sm">
					<li class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-emerald-500"></i> Present <strong class="ml-auto">{data.today.present.toLocaleString('en-IN')}</strong></li>
					<li class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-rose-500"></i> Absent <strong class="ml-auto">{data.today.absent.toLocaleString('en-IN')}</strong></li>
					<li class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-amber-400"></i> Leave <strong class="ml-auto">{data.today.leave.toLocaleString('en-IN')}</strong></li>
				</ul>
			</div>
			<a class="mt-4 block text-center text-sm font-semibold text-blue-600" href={resolve('/school/academic')}>View Attendance Report →</a>
		</article>

		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Upcoming Events</h2>
				<a class="text-xs font-semibold text-blue-600" href={resolve('/school/exams')}>View All</a>
			</div>
			<ul class="mt-3 space-y-3">
				{#each data.events as event (event.title + event.at)}
					{@const parts = eventParts(event.at)}
					<li class="flex gap-3">
						<span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-center leading-none text-blue-700">
							<strong class="text-sm">{parts.day}</strong>
							<span class="text-[10px] uppercase">{parts.month}</span>
						</span>
						<span>
							<span class="block text-sm font-semibold">{event.title}</span>
							<span class="block text-xs text-slate-500">{parts.time} · {event.place}</span>
						</span>
					</li>
				{:else}
					<li class="py-6 text-sm text-slate-500">No upcoming exams yet.</li>
				{/each}
			</ul>
		</article>
	</section>

	<section class="grid gap-4 xl:grid-cols-3">
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Fee Collection Status</h2>
			<p class="mt-3 text-sm text-slate-500">
				<span class="text-lg font-bold text-slate-900">{money.format(data.collectedRupees)}</span>
				/ {money.format(data.billedRupees)}
				<span class="float-right font-semibold text-emerald-600">{feePercent}%</span>
			</p>
			<div class="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100">
				<div class="h-full rounded-full bg-emerald-500" style:width="{feePercent}%"></div>
			</div>
		</article>
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Pending Tasks</h2>
			<ul class="mt-3 space-y-3 text-sm">
				<li>
					<a class="flex items-center gap-2" href={resolve('/school/people')}>
						<span class="h-4 w-4 rounded border border-slate-300"></span>
						Open admission requests ({data.pending.documents})
					</a>
				</li>
				<li>
					<a class="flex items-center gap-2" href={resolve('/school/fees')}>
						<span class="h-4 w-4 rounded border border-slate-300"></span>
						Verify pending fee payments ({data.pending.invoices})
					</a>
				</li>
				<li>
					<a class="flex items-center gap-2" href={resolve('/school/reports')}>
						<span class="h-4 w-4 rounded border border-slate-300"></span>
						Generate monthly report
					</a>
				</li>
			</ul>
		</article>
		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Quick Actions</h2>
			<div class="mt-4 flex flex-wrap gap-2">
				<a class="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700" href={resolve('/school/people')}>Add Student</a>
				<a class="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" href={resolve('/school/staff')}>Add Teacher</a>
				<a class="rounded-full bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700" href={resolve('/school/notices')}>Create Notice</a>
				<a class="rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700" href={resolve('/school/reports')}>Generate Report</a>
				<a class="rounded-full bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-700" href={resolve('/school/fees')}>Fee Collection</a>
			</div>
		</article>
	</section>
</div>
