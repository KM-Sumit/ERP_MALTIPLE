<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const selectedId = $derived(page.url.searchParams.get('session'));
	const selected = $derived(data.sessions.find((session) => session.id === selectedId) ?? null);
	const sessionStudents = $derived(
		data.students.filter((student) => student.sessionId === selected?.id)
	);
	const sessionSections = $derived(
		data.sections.filter((section) =>
			data.classes.some((item) => item.id === section.classId && item.sessionId === selected?.id)
		)
	);
	const sessionTimetables = $derived(
		data.timetables.filter((file) => file.sessionId === selected?.id)
	);

	function sessionHref(id: string) {
		return `${resolve('/school/academic')}?session=${id}`;
	}
</script>

<h1 class="text-2xl font-semibold text-slate-900">Academics</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}

<section class="mt-4 rounded-2xl bg-white p-4 shadow-sm">
	<h2 class="font-semibold text-slate-900">New session</h2>
	<form class="mt-3 grid gap-3" method="post" action="?/structure">
		<Field label="Session name" name="sessionName" required maxlength={40} placeholder="2026-27" />
		<Field label="Start" name="startDate" type="date" />
		<Field label="End" name="endDate" type="date" />
		<p class="text-xs text-slate-500">Leave the dates empty to use this school year, from 1 April to 31 March.</p>
		<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Create session</button>
	</form>
</section>

{#if data.sessions.length === 0}
	<p class="mt-4 text-sm text-slate-600">No sessions yet. Create one below.</p>
{:else}
	<div class="mt-4 grid grid-cols-2 gap-2">
		{#each data.sessions as session (session.id)}
			{@const count = data.students.filter((student) => student.sessionId === session.id).length}
			<a
				class="rounded-2xl px-3 py-3 text-left {selected?.id === session.id
					? 'bg-emerald-700 text-white'
					: 'bg-white text-slate-800 shadow-sm'}"
				href={sessionHref(session.id)}
			>
				<span class="block font-semibold">{session.name}</span>
				<span class="text-xs {selected?.id === session.id ? 'text-emerald-100' : 'text-slate-500'}"
					>{session.startDate} – {session.endDate} · {session.status} · {count}
					{count === 1 ? 'student' : 'students'}</span
				>
			</a>
		{/each}
	</div>
{/if}

{#if selected}
	<section class="mt-4 rounded-2xl bg-white p-4 shadow-sm">
		<h2 class="text-lg font-semibold text-slate-900">{selected.name}</h2>
		<form class="mt-4 grid gap-3" method="post" action="?session={selected.id}&/session">
			<h3 class="font-medium text-slate-900">Edit session</h3>
			<input type="hidden" name="sessionId" value={selected.id} />
			<Field label="Session name" name="sessionName" value={selected.name} maxlength={40} required />
			<Field label="Start" name="startDate" type="date" value={String(selected.startDate).slice(0, 10)} required />
			<Field label="End" name="endDate" type="date" value={String(selected.endDate).slice(0, 10)} required />
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Status</span>
				<select class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="status">
					<option value="planned" selected={selected.status === 'planned'}>Planned</option>
					<option value="active" selected={selected.status === 'active'}>Active</option>
					<option value="closed" selected={selected.status === 'closed'}>Closed</option>
				</select>
			</label>
			<p class="text-xs text-slate-500">Only one session can be active. Saving this one as active moves the previous active session to planned.</p>
			<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Save session</button>
		</form>
		<p class="mt-4 text-sm text-slate-600">
			{sessionStudents.length}
			{sessionStudents.length === 1 ? 'student' : 'students'} in this session
		</p>
		{#if sessionStudents.length === 0}
			<p class="mt-3 text-sm text-slate-500">No students yet.</p>
		{:else}
			<ul class="mt-3 grid gap-2 text-sm">
				{#each sessionStudents as student (`${student.admissionNo}-${student.sectionName}`)}
					<li class="rounded-xl bg-slate-50 px-3 py-2">
						{student.firstName}
						{student.lastName}
						<span class="text-slate-500">· {student.admissionNo} · {student.sectionName}</span>
					</li>
				{/each}
			</ul>
		{/if}

		{#if sessionSections.length === 0}
			<p class="mt-4 text-sm text-amber-900">
				Add a class and section for this session before adding students.
			</p>
		{:else}
			<form class="mt-4 grid gap-3" method="post" action="?session={selected.id}&/student">
				<h3 class="font-medium text-slate-900">Add student</h3>
				{#if form?.studentInvitePath}
					<p class="text-sm text-slate-700">
						Student setup link:
						<a
							class="font-medium text-teal-800"
							href={resolve('/invite/[token]', {
								token: form.studentInvitePath.split('/').pop() ?? ''
							})}>{form.studentInvitePath}</a
						>
					</p>
				{/if}
				<input type="hidden" name="sessionId" value={selected.id} />
				<Field label="Admission number" name="admissionNo" required />
				<Field label="First name" name="firstName" required />
				<Field label="Last name" name="lastName" required />
				<Field label="Student email" name="email" type="email" required />
				<label class="grid gap-1 text-sm">
					<span class="font-medium text-slate-700">Section</span>
					<select
						class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
						name="sectionId"
						required
					>
						{#each sessionSections as section (section.id)}
							<option value={section.id}>{section.name}</option>
						{/each}
					</select>
				</label>
				<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
					Add student
				</button>
			</form>
		{/if}

		<form
			class="mt-6 grid gap-3"
			method="post"
			action="?session={selected.id}&/timetable"
			enctype="multipart/form-data"
		>
			<h3 class="font-medium text-slate-900">Timetable</h3>
			<input type="hidden" name="sessionId" value={selected.id} />
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Upload PDF or photo</span>
				<input
					class="text-sm"
					name="timetable"
					type="file"
					accept="application/pdf,image/png,image/jpeg"
					required
				/>
			</label>
			<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
				Upload timetable
			</button>
		</form>
		{#if sessionTimetables.length > 0}
			<ul class="mt-3 grid gap-2 text-sm">
				{#each sessionTimetables as file (file.fileId)}
					<li>
						<a
							class="text-teal-800"
							href={resolve('/school/academic/files/[id]', { id: file.fileId })}
						>
							Timetable file
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<details class="mt-4 rounded-2xl bg-white p-4 shadow-sm">
	<summary class="cursor-pointer font-semibold text-emerald-800"
		>New session, class, or subject</summary
	>
	<form class="mt-4 grid gap-3" method="post" action="?/structure">
		<Field label="New session name" name="sessionName" />
		<Field label="Start" name="startDate" type="date" />
		<Field label="End" name="endDate" type="date" />
		<p class="text-xs text-slate-500">Leave the dates empty to use this school year, from 1 April to 31 March. The end date must be on or after the start date.</p>
		<Field label="Class name" name="className" />
		<Field label="Section" name="sectionName" />
		<Field label="Subject" name="subjectName" />
		<Field label="Subject code" name="subjectCode" />
		<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit"
			>Add</button
		>
	</form>
	{#if data.subjects.length > 0}
		<p class="mt-3 text-sm text-slate-600">
			Subjects: {data.subjects.map((subject) => subject.name).join(', ')}
		</p>
	{/if}
</details>
