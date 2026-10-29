<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const first = $derived(data.fullName?.split(' ')[0] || 'Teacher');
	const students = $derived(data.classes.reduce((sum, room) => sum + room.students, 0));
	const classLine = $derived(data.classes.map((room) => room.className).join(', '));
	const openComplaints = $derived(
		data.complaints.filter((item) => item.status === 'open' || item.status === 'in_review' || item.status === 'assigned').length
	);
	const pendingTasks = $derived(data.tasks.reduce((sum, task) => sum + Math.max(0, task.total - task.submitted), 0));
	const sectionId = $derived(page.url.searchParams.get('section') || data.classes[0]?.sectionId || '');
	const chosen = $derived(data.classes.find((room) => room.sectionId === sectionId) ?? data.classes[0]);
	const roster = $derived(data.roster.filter((row) => !sectionId || row.sectionId === sectionId));
	const present = $derived(roster.filter((row) => row.status === 'present' || row.status === 'late').length);
	const absent = $derived(roster.filter((row) => row.status === 'absent').length);
	const leave = $derived(roster.filter((row) => row.status === 'excused').length);
	const marked = $derived(present + absent + leave);
	const average = $derived(
		data.performance.length === 0
			? 0
			: Math.round(data.performance.reduce((sum, row) => sum + row.percent, 0) / data.performance.length)
	);
	const barColors = ['#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c'];
	const todayLabel = new Intl.DateTimeFormat('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'Asia/Kolkata'
	}).format(new Date());

	function ago(value: string) {
		const time = Date.parse(value);
		if (Number.isNaN(time)) return '';
		const hours = Math.round((Date.now() - time) / 3_600_000);
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.round(hours / 24);
		if (days === 1) return 'Yesterday';
		return `${days} days ago`;
	}
	function when(value: string) {
		const time = Date.parse(value);
		if (Number.isNaN(time)) return '—';
		return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(time);
	}
	function clock(value: string) {
		const time = Date.parse(value);
		if (Number.isNaN(time)) return '';
		return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(time);
	}
	function periodState(start: string, end: string) {
		const now = new Intl.DateTimeFormat('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			timeZone: 'Asia/Kolkata'
		}).format(new Date());
		if (now < start) return 'Upcoming';
		if (now > end) return 'Completed';
		return 'Ongoing';
	}
	function complaintTone(status: string) {
		if (status === 'resolved' || status === 'closed') return { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700' };
		if (status === 'in_review' || status === 'assigned') return { label: 'In Progress', className: 'bg-amber-50 text-amber-700' };
		return { label: 'New', className: 'bg-rose-50 text-rose-600' };
	}
	function markLabel(status: string) {
		if (status === 'late' || status === 'present') return 'Present';
		if (status === 'absent') return 'Absent';
		if (status === 'excused') return 'Leave';
		return 'Not marked';
	}
</script>

<div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
	<div class="space-y-4">
		<section class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center gap-4">
				<span class="grid h-14 w-14 place-items-center rounded-full bg-[#dbe7ff] text-xl font-bold text-[#2f6bff]">{first.charAt(0)}</span>
				<div>
					<h1 class="text-2xl font-bold text-slate-900">Welcome Back, {first}!</h1>
					<p class="text-sm text-slate-500">Here's an overview of your classes and activities today.</p>
				</div>
			</div>
			<p class="max-w-xs text-right text-xs italic text-slate-400">“A good teacher can inspire hope, ignite imagination and instill a love for learning.”</p>
		</section>

		<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<article class="rounded-2xl bg-[#eef4ff] p-4">
				<p class="text-xs text-slate-500">My Classes</p>
				<p class="text-2xl font-bold">{data.classes.length}</p>
				<p class="truncate text-xs text-slate-500">{classLine || 'None assigned'}</p>
			</article>
			<article class="rounded-2xl bg-[#e9fbf3] p-4">
				<p class="text-xs text-slate-500">Total Students</p>
				<p class="text-2xl font-bold">{students}</p>
				<p class="text-xs text-slate-500">Across all classes</p>
			</article>
			<article class="rounded-2xl bg-[#f3eefe] p-4">
				<p class="text-xs text-slate-500">Today's Classes</p>
				<p class="text-2xl font-bold">{data.periods.length}</p>
				<p class="text-xs text-slate-500">Published periods</p>
			</article>
			<article class="rounded-2xl bg-[#fff8e8] p-4">
				<p class="text-xs text-slate-500">Pending Homework</p>
				<p class="text-2xl font-bold">{pendingTasks}</p>
				<p class="text-xs text-slate-500">To check and grade</p>
			</article>
			<article class="rounded-2xl bg-[#fff1f2] p-4">
				<p class="text-xs text-slate-500">Complaints</p>
				<p class="text-2xl font-bold">{openComplaints}</p>
				<p class="text-xs text-slate-500">Open or in review</p>
			</article>
		</section>

		<section id="timetable" class="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
			<article class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between gap-2">
					<h2 class="font-bold">Today's Timetable</h2>
					<span class="text-xs font-semibold text-slate-500">{todayLabel}</span>
				</div>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full min-w-[560px] text-left text-sm">
						<thead class="text-xs text-slate-400">
							<tr><th class="py-2">Time</th><th>Class</th><th>Subject</th><th>Room</th><th>Status</th><th>Action</th></tr>
						</thead>
						<tbody>
							{#each data.periods as period (`${period.start}-${period.sectionId}-${period.subject}`)}
								{@const state = periodState(period.start, period.end)}
								<tr class="border-t border-slate-100">
									<td class="py-2.5">{period.start} – {period.end}</td>
									<td>{period.className} · {period.sectionName}</td>
									<td>{period.subject}</td>
									<td>{period.room || '—'}</td>
									<td>
										<span class="rounded-full px-2 py-0.5 text-xs font-semibold {state === 'Completed' ? 'bg-emerald-50 text-emerald-700' : state === 'Ongoing' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">{state}</span>
									</td>
									<td>
										<a class="font-semibold text-[#2f6bff]" href="{resolve('/teach/attendance')}?section={period.sectionId}">{state === 'Ongoing' ? 'Join / Take' : 'Take'}</a>
									</td>
								</tr>
							{:else}
								<tr><td class="py-6 text-slate-500" colspan="6">No published class is scheduled for today.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</article>
			<article class="rounded-2xl bg-white p-5 shadow-sm">
				<h2 class="font-bold">Quick Actions</h2>
				<div class="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
					<a class="rounded-2xl bg-[#eef4ff] px-2 py-4 text-[#2f6bff]" href={resolve('/teach/attendance')}>Take Attendance</a>
					<a class="rounded-2xl bg-[#f3eefe] px-2 py-4 text-violet-700" href={resolve('/teach/homework')}>Assign Homework</a>
					<a class="rounded-2xl bg-[#fff8e8] px-2 py-4 text-amber-700" href={resolve('/teach/homework')}>Upload Study Material</a>
					<a class="rounded-2xl bg-[#fff1f2] px-2 py-4 text-rose-600" href={resolve('/teach/marks')}>Create Test</a>
					<a class="rounded-2xl bg-[#fff7ed] px-2 py-4 text-orange-700" href="#complaints">View Complaints</a>
					<a class="rounded-2xl bg-[#ecfeff] px-2 py-4 text-cyan-700" href="#notices">Send Announcement</a>
					<a class="rounded-2xl bg-[#f5f3ff] px-2 py-4 text-violet-700" href={resolve('/teach/marks')}>Check Results</a>
					<a class="rounded-2xl bg-[#fdf2f8] px-2 py-4 text-pink-700" href={resolve('/teach/profile')}>Leave Request</a>
				</div>
			</article>
		</section>

		<section class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-bold">Student Attendance (Today)</h2>
				<div class="flex items-center gap-2">
					<label class="text-sm">
						<span class="sr-only">Select class</span>
						<select
							class="rounded-xl border border-slate-200 px-3 py-2"
							value={sectionId}
							onchange={(event) => {
								const next = event.currentTarget.value;
								goto(next ? `${resolve('/teach')}?section=${next}` : resolve('/teach'));
							}}
						>
							{#each data.classes as room (room.sectionId)}
								<option value={room.sectionId}>Class {room.className} · {room.sectionName}</option>
							{/each}
						</select>
					</label>
					<a class="rounded-xl bg-[#2f6bff] px-4 py-2 text-sm font-semibold text-white" href="{resolve('/teach/attendance')}{sectionId ? `?section=${sectionId}` : ''}">Take Attendance</a>
				</div>
			</div>
			<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
				<article class="rounded-xl bg-slate-50 p-3 text-center"><p class="text-xs text-slate-500">Total</p><p class="text-xl font-bold">{roster.length}</p></article>
				<article class="rounded-xl bg-emerald-50 p-3 text-center"><p class="text-xs text-emerald-700">Present</p><p class="text-xl font-bold">{present}</p></article>
				<article class="rounded-xl bg-rose-50 p-3 text-center"><p class="text-xs text-rose-600">Absent</p><p class="text-xl font-bold">{absent}</p></article>
				<article class="rounded-xl bg-amber-50 p-3 text-center"><p class="text-xs text-amber-700">Leave</p><p class="text-xl font-bold">{leave}</p></article>
			</div>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full min-w-[480px] text-left text-sm">
					<thead class="text-xs text-slate-400">
						<tr><th class="py-2">#</th><th>Roll No.</th><th>Student Name</th><th>Status</th></tr>
					</thead>
					<tbody>
						{#each roster.slice(0, 8) as student, index (student.id)}
							<tr class="border-t border-slate-100">
								<td class="py-2">{index + 1}</td>
								<td>{student.roll || '—'}</td>
								<td class="font-medium">{student.name}</td>
								<td>
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {student.status === 'absent' ? 'bg-rose-50 text-rose-600' : student.status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">{markLabel(student.status)}</span>
								</td>
							</tr>
						{:else}
							<tr><td class="py-6 text-slate-500" colspan="4">{chosen ? 'No students in this class.' : 'No class is assigned yet.'}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if marked === 0 && roster.length > 0}
				<p class="mt-2 text-xs text-slate-500">Attendance has not been marked today.</p>
			{/if}
			<a class="mt-3 inline-block text-xs font-semibold text-[#2f6bff]" href={resolve('/teach/attendance')}>View full attendance</a>
		</section>

		<section class="grid gap-4 xl:grid-cols-2">
			<article id="subjects" class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between">
					<h2 class="font-bold">Pending Homework & Assignments</h2>
					<a class="text-xs font-semibold text-[#2f6bff]" href={resolve('/teach/homework')}>View All</a>
				</div>
				<ul class="mt-3 divide-y divide-slate-100 text-sm">
					{#each data.tasks as task (task.id)}
						<li class="flex items-start justify-between gap-3 py-3">
							<div>
								<p class="font-semibold">{task.className ? `Class ${task.className}${task.sectionName ? ` · ${task.sectionName}` : ''}` : 'Class'} · {task.title}</p>
								<p class="text-xs text-slate-500">{task.subject || 'Subject'} · {task.submitted}/{task.total} submitted</p>
							</div>
							<div class="text-right text-xs">
								<p class="font-semibold text-rose-600">{Math.max(0, task.total - task.submitted)} pending</p>
								<p class="text-slate-400">{task.dueAt ? when(task.dueAt) : 'No due date'}</p>
							</div>
						</li>
					{:else}
						<li class="py-6 text-slate-500">No homework is published for your classes.</li>
					{/each}
				</ul>
			</article>
			<article class="rounded-2xl bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between">
					<h2 class="font-bold">Student Performance{chosen ? ` (Class ${chosen.className} · ${chosen.sectionName})` : ''}</h2>
					<a class="text-xs font-semibold text-[#2f6bff]" href={resolve('/teach/marks')}>View All</a>
				</div>
				<p class="mt-3 text-sm text-slate-500">Average marks <span class="text-lg font-bold text-slate-900">{average}%</span></p>
				{#if data.performance.length === 0}
					<p class="mt-6 text-sm text-slate-500">Published marks will appear here.</p>
				{:else}
					<div class="mt-4 flex h-28 items-end gap-3">
						{#each data.performance as row, index (row.subject)}
							<div class="flex flex-1 flex-col items-center gap-1">
								<span class="text-[11px] font-semibold">{row.percent}%</span>
								<div class="w-full rounded-t-lg" style="height: {Math.max(8, row.percent)}%; background: {barColors[index % barColors.length]}"></div>
								<span class="truncate text-[11px] text-slate-500">{row.subject}</span>
							</div>
						{/each}
					</div>
				{/if}
			</article>
		</section>

		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Exam & Results</h2>
				<a class="text-xs font-semibold text-[#2f6bff]" href={resolve('/teach/marks')}>View All</a>
			</div>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full min-w-[520px] text-left text-sm">
					<thead class="text-xs text-slate-400">
						<tr><th class="py-2">Exam Name</th><th>Subject</th><th>Date</th><th>Status</th><th>Action</th></tr>
					</thead>
					<tbody>
						{#each data.papers as exam (`${exam.id}-${exam.subject}-${exam.startsAt}`)}
							<tr class="border-t border-slate-100">
								<td class="py-2 font-medium">{exam.name}</td>
								<td>{exam.subject || '—'}</td>
								<td>{exam.startsAt ? when(exam.startsAt) : '—'}</td>
								<td><span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">{exam.status.replaceAll('_', ' ')}</span></td>
								<td><a class="font-semibold text-[#2f6bff]" href={resolve('/teach/marks')}>Open</a></td>
							</tr>
						{:else}
							<tr><td class="py-6 text-slate-500" colspan="5">No exams yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</article>
	</div>

	<aside class="space-y-4">
		<article id="complaints" class="rounded-2xl bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="font-bold">Recent Complaints</h2>
				<a class="text-xs font-semibold text-[#2f6bff]" href="#complaints">View All</a>
			</div>
			<ul class="mt-3 space-y-3 text-sm">
				{#each data.complaints.slice(0, 4) as complaint (complaint.id)}
					{@const tone = complaintTone(complaint.status)}
					<li>
						<div class="flex items-start justify-between gap-2">
							<p class="font-semibold">{complaint.subject}</p>
							<span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold {tone.className}">{tone.label}</span>
						</div>
						<p class="line-clamp-2 text-xs text-slate-500">{complaint.body}</p>
						<p class="text-[11px] text-slate-400">{ago(String(complaint.createdAt))}</p>
					</li>
				{:else}
					<li class="py-4 text-sm text-slate-500">No complaints yet.</li>
				{/each}
			</ul>
		</article>

		<article id="notices" class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Announcements</h2>
			<ul class="mt-3 space-y-3 text-sm">
				{#each data.notices.slice(0, 4) as notice (notice.id)}
					<li>
						<p class="font-semibold">{notice.title}</p>
						<p class="line-clamp-2 text-xs text-slate-500">{notice.body}</p>
						<p class="text-[11px] text-slate-400">{ago(String(notice.createdAt))}</p>
					</li>
				{:else}
					<li class="py-4 text-sm text-slate-500">No announcements yet.</li>
				{/each}
			</ul>
		</article>

		<article class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">Messages</h2>
			<ul class="mt-3 space-y-3 text-sm">
				{#each data.messages as message (message.id)}
					<li>
						<p class="font-semibold">{message.title}</p>
						<p class="line-clamp-2 text-xs text-slate-500">{message.body}</p>
						<p class="text-[11px] text-slate-400">{clock(message.createdAt) || ago(message.createdAt)}</p>
					</li>
				{:else}
					<li class="py-4 text-sm text-slate-500">No messages yet.</li>
				{/each}
			</ul>
		</article>

		<article id="classes" class="rounded-2xl bg-white p-5 shadow-sm">
			<h2 class="font-bold">My Leave Requests</h2>
			<ul class="mt-3 space-y-3 text-sm">
				{#each data.leaves as leaveRow (leaveRow.id)}
					<li class="flex items-start justify-between gap-2">
						<div>
							<p class="font-semibold">{leaveRow.reason}</p>
							<p class="text-xs text-slate-500">{when(leaveRow.start)} – {when(leaveRow.end)}</p>
						</div>
						<span class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-amber-700">{leaveRow.status}</span>
					</li>
				{:else}
					<li class="py-4 text-sm text-slate-500">No leave requests.</li>
				{/each}
			</ul>
		</article>
	</aside>
</div>
