<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const focused = $derived(
		data.timetables.find((item) => item.id === data.focus) ?? data.timetables[0]
	);
	const preview = $derived(
		data.entries.filter((entry) => focused && entry.timetableId === focused.id)
	);
	const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const weekIndex = [1, 2, 3, 4, 5, 6];
	const periodRows = $derived([...data.periods].sort((left, right) => left.sortOrder - right.sortOrder));
	const palette = ['bg-blue-100', 'bg-emerald-100', 'bg-amber-100', 'bg-violet-100', 'bg-rose-100', 'bg-cyan-100'];
	function cell(weekday: number, periodId: string) {
		return preview.find((entry) => entry.weekday === weekday && entry.periodId === periodId);
	}
	function subjectName(subjectId: string) {
		return data.subjects.find((subject) => subject.id === subjectId)?.name ?? 'Period';
	}
	function teacherName(userId: string | null) {
		return data.people.find((person) => person.id === userId)?.fullName ?? '';
	}
</script>

<p class="text-xs text-slate-400">Dashboard  /  Timetable</p>
<h1 class="text-2xl font-bold text-slate-900">Timetable</h1>
<p class="text-sm text-slate-500">Manage class timetable and subject schedules</p>
<div class="mt-4 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm">
	<table class="w-full min-w-[760px] border-separate border-spacing-1 text-center text-xs">
		<thead>
			<tr>
				<th class="w-24 text-slate-400">Time</th>
				{#each week as day (day)}<th class="text-slate-500">{day}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#each periodRows as period (period.id)}
				<tr>
					<th class="rounded-lg bg-slate-50 px-2 py-3 text-slate-500">{period.name}<br />{period.startTime ?? ''}–{period.endTime ?? ''}</th>
					{#each weekIndex as weekday (weekday)}
						{@const entry = cell(weekday, period.id)}
						<td class="rounded-lg px-1 py-3 {entry ? palette[weekday % palette.length] : 'bg-slate-50 text-slate-300'}">
							{#if entry}
								<p class="font-semibold text-slate-800">{subjectName(entry.subjectId)}</p>
								<p class="text-[10px] text-slate-500">{teacherName(entry.teacherUserId)}</p>
							{:else}
								—
							{/if}
						</td>
					{/each}
				</tr>
			{:else}
				<tr><td class="py-8 text-slate-500" colspan="7">Add periods below to build the weekly grid.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="mt-4 text-sm text-slate-500">Drafts stay private until you publish. The forms below save working days, periods, and class slots.</p>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-3 text-sm text-emerald-800">{form.saved}</p>{/if}

<section class="mt-6 grid gap-4 md:grid-cols-2">
	<form class="grid gap-2 rounded-md border border-stone-200 p-3" method="post" action="?/calendar">
		<h2 class="font-medium">Working days</h2>
		<div class="flex flex-wrap gap-2">
			{#each days as day, index (day)}
				<label class="text-sm">
					<input
						type="checkbox"
						name="workingDays"
						value={index}
						checked={data.settings.workingDays.includes(index)}
					/>
					{day}
				</label>
			{/each}
		</div>
		<label class="text-sm"
			>Start <input
				class="rounded border px-2 py-1"
				name="dayStart"
				type="time"
				value={data.settings.dayStart.slice(0, 5)}
				required
			/></label
		>
		<label class="text-sm"
			>End <input
				class="rounded border px-2 py-1"
				name="dayEnd"
				type="time"
				value={data.settings.dayEnd.slice(0, 5)}
				required
			/></label
		>
		<label class="text-sm"
			><input
				type="checkbox"
				name="absentCountsAsZero"
				checked={data.settings.absentCountsAsZero}
			/> Count absence as zero in percentages</label
		>
		<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
			>Save calendar</button
		>
	</form>
	<form class="grid gap-2 rounded-md border border-stone-200 p-3" method="post" action="?/period">
		<h2 class="font-medium">Period or break</h2>
		<label class="text-sm"
			>Name <input class="w-full rounded border px-2 py-1" name="name" required /></label
		>
		<label class="text-sm"
			>Start <input class="rounded border px-2 py-1" name="start" type="time" required /></label
		>
		<label class="text-sm"
			>End <input class="rounded border px-2 py-1" name="end" type="time" required /></label
		>
		<label class="text-sm"
			>Order <input
				class="w-20 rounded border px-2 py-1"
				name="sortOrder"
				type="number"
				min="1"
				value="1"
				required
			/></label
		>
		<label class="text-sm"
			>Kind
			<select class="rounded border px-2 py-1" name="kind"
				><option value="teaching">teaching</option><option value="break">break</option></select
			>
		</label>
		<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
			>Add slot</button
		>
	</form>
</section>

<form class="mt-4 flex flex-wrap items-end gap-2" method="post" action="?/room">
	<label class="text-sm"
		>Classroom <input class="rounded border px-2 py-1" name="name" required /></label
	>
	<label class="text-sm"
		>Capacity <input
			class="w-24 rounded border px-2 py-1"
			name="capacity"
			type="number"
			min="1"
		/></label
	>
	<button class="rounded-md border px-3 py-2 text-sm" type="submit">Add classroom</button>
</form>

{#if data.periods.length === 0}
	<p class="mt-4 text-sm text-stone-600">Add period slots before building a week.</p>
{:else}
	<form class="mt-4 grid gap-2 md:grid-cols-4" method="post" action="?/open">
		<label class="text-sm"
			>Session
			<select class="w-full rounded border px-2 py-1" name="sessionId" required>
				{#each data.sessions as session (session.id)}<option value={session.id}
						>{session.name}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Section
			<select class="w-full rounded border px-2 py-1" name="sectionId" required>
				{#each data.sections as section (section.id)}<option value={section.id}
						>{section.name}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Name <input class="w-full rounded border px-2 py-1" name="name" required /></label
		>
		<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
			>Create draft</button
		>
	</form>
{/if}

{#if data.timetables.length === 0}
	<p class="mt-6 text-sm text-stone-600">No timetable drafts yet.</p>
{:else}
	<div class="mt-6 overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead><tr><th>Name</th><th>Status</th><th>Revision</th><th></th></tr></thead>
			<tbody>
				{#each data.timetables as timetable (timetable.id)}
					<tr class="border-t">
						<td class="py-2">{timetable.name}</td>
						<td>{timetable.status}</td>
						<td>{timetable.revision}</td>
						<td>
							{#if timetable.status === 'published'}
								<form method="get" action={resolve('/school/timetable/export')}>
									<input type="hidden" name="id" value={timetable.id} />
									<button class="underline" type="submit">Export</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if focused}
		<h2 class="mt-6 font-medium">Assign a period — {focused.name}</h2>
		<p class="text-sm text-stone-600">
			Lock version {focused.lockVersion}. Reload after another editor saves.
		</p>
		<form class="mt-2 grid gap-2 md:grid-cols-3" method="post" action="?/entry">
			<input type="hidden" name="timetableId" value={focused.id} />
			<input type="hidden" name="lockVersion" value={focused.lockVersion} />
			<label class="text-sm"
				>Day
				<select class="w-full rounded border px-2 py-1" name="weekday">
					{#each days as day, index (day)}<option value={index}>{day}</option>{/each}
				</select>
			</label>
			<label class="text-sm"
				>Period
				<select class="w-full rounded border px-2 py-1" name="periodId">
					{#each data.periods as period (period.id)}<option value={period.id}
							>{period.name} {period.startTime}</option
						>{/each}
				</select>
			</label>
			<label class="text-sm"
				>Subject
				<select class="w-full rounded border px-2 py-1" name="subjectId">
					{#each data.subjects as subject (subject.id)}<option value={subject.id}
							>{subject.name}</option
						>{/each}
				</select>
			</label>
			<label class="text-sm"
				>Teacher
				<select class="w-full rounded border px-2 py-1" name="teacherUserId">
					{#each data.people as person (person.id)}<option value={person.id}
							>{person.fullName}</option
						>{/each}
				</select>
			</label>
			<label class="text-sm"
				>Classroom
				<select class="w-full rounded border px-2 py-1" name="classroomId">
					<option value="">None</option>
					{#each data.rooms as room (room.id)}<option value={room.id}>{room.name}</option>{/each}
				</select>
			</label>
			<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
				>Save assignment</button
			>
		</form>
		<h3 class="mt-4 text-sm font-medium">Preview</h3>
		{#if preview.length === 0}
			<p class="text-sm text-stone-600">This draft has no periods yet.</p>
		{:else}
			<ul class="text-sm">
				{#each preview as entry (entry.id)}
					<li>
						{days[entry.weekday]} · period {entry.periodId.slice(0, 8)} · subject {entry.subjectId.slice(
							0,
							8
						)}
					</li>
				{/each}
			</ul>
		{/if}
		<div class="mt-3 flex gap-2">
			{#if focused.status === 'draft'}
				<form method="post" action="?/publish">
					<input type="hidden" name="timetableId" value={focused.id} />
					<input type="hidden" name="lockVersion" value={focused.lockVersion} />
					<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
						>Publish</button
					>
				</form>
			{:else}
				<form method="post" action="?/revise">
					<input type="hidden" name="timetableId" value={focused.id} />
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Revise</button>
				</form>
			{/if}
		</div>
	{/if}
{/if}

<h2 class="mt-8 font-medium">Revision history</h2>
{#if data.revisions.length === 0}
	<p class="text-sm text-stone-600">Published revisions will appear here.</p>
{:else}
	<ul class="text-sm">
		{#each data.revisions as revision (revision.id)}
			<li>Revision {revision.revision} · {revision.createdAt}</li>
		{/each}
	</ul>
{/if}
