<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const query = $derived(page.url.searchParams.get('q')?.trim().toLowerCase() ?? '');
	const adding = $derived(page.url.searchParams.get('add') === '1');
	const selectedSessionId = $derived(form?.sessionId ?? page.url.searchParams.get('session') ?? '');
	const showSessions = $derived(page.url.searchParams.get('list') === 'sessions');
	const selectedSession = $derived(data.sessions.find((session) => session.id === selectedSessionId) ?? null);
	const sessionClasses = $derived(
		data.classes.filter((room) => room.sessionId === selectedSession?.id && (!query || `${room.name} ${room.sectionName}`.toLowerCase().includes(query)))
	);
	const selectedId = $derived(form?.classId ?? page.url.searchParams.get('class') ?? (!adding ? sessionClasses[0]?.id : ''));
	const selected = $derived(sessionClasses.find((item) => item.id === selectedId) ?? data.classes.find((item) => item.id === selectedId) ?? null);
	const classStudents = $derived(data.students.filter((student) => student.classId === selected?.id));
	const classFiles = $derived(data.timetables.filter((file) => file.classId === selected?.id));
	const classCourses = $derived(data.courses.filter((course) => course.classId === selected?.id));
	const sectionCount = $derived(data.classes.filter((room) => !selectedSession || room.sessionId === selectedSession.id).length);
	const studentCount = $derived(
		data.classes
			.filter((room) => !selectedSession || room.sessionId === selectedSession.id)
			.reduce((sum, room) => sum + data.students.filter((student) => student.classId === room.id).length, 0)
	);

	function href(extra: Record<string, string>) {
		const params = new URLSearchParams();
		if (selectedSessionId) params.set('session', selectedSessionId);
		for (const [key, value] of Object.entries(extra)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const text = params.toString();
		return text ? `${resolve('/school/classes')}?${text}` : resolve('/school/classes');
	}
</script>

<RecordPage
	crumb="Dashboard  /  Classes & Sections"
	title="Classes & Sections"
	detail="Manage classes, sections, assign class teachers and subjects"
	stats={[
		{ label: 'Total Classes', value: String(sessionClasses.length), note: selectedSession?.name ?? 'No session', tone: 'bg-[#eef4ff]' },
		{ label: 'Total Sections', value: String(sectionCount), note: 'One section is created with each class', tone: 'bg-[#e9fbf3]' },
		{ label: 'Class Teachers', value: '—', note: 'Assigned from the class form', tone: 'bg-[#f3eefe]' },
		{ label: 'Total Students', value: String(studentCount), note: 'In this session', tone: 'bg-[#fff8e8]' }
	]}
>
	{#snippet actions()}
		<a class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={href({ add: '1', class: '' })}>+ Add Class</a>
	{/snippet}
	<div class="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
		{#if !selectedSessionId && !showSessions}
			<a class="rounded-lg bg-[#2f6bff] px-4 py-2 text-sm font-semibold text-white" href={`${resolve('/school/classes')}?list=sessions`}>Sessions</a>
			<p class="text-sm text-slate-500">Open Sessions, then choose one to add its classes.</p>
		{:else if !selectedSessionId}
			{#each data.sessions as session (session.id)}
				<a class="rounded-full bg-slate-100 px-3 py-1 text-sm" href={`${resolve('/school/classes')}?session=${session.id}`}>{session.name}</a>
			{:else}
				<p class="text-sm text-slate-500">No session yet. Create one in Academics.</p>
			{/each}
		{:else}
			<a class="rounded-full bg-slate-100 px-3 py-1 text-sm" href={`${resolve('/school/classes')}?list=sessions`}>All sessions</a>
			<span class="rounded-full bg-[#2f6bff] px-3 py-1 text-sm text-white">{selectedSession?.name}</span>
		{/if}
	</div>
	{#if selectedSession}
		<form class="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2" method="post" action="?/class">
			<h2 class="sm:col-span-2 font-semibold">Add class in {selectedSession.name}</h2>
			<input type="hidden" name="sessionId" value={selectedSession.id} />
			<Field label="Class name" name="name" required maxlength={80} />
			<label class="grid gap-1 text-sm">Fees in rupees
				<input class="rounded-lg border px-2 py-2" name="feeRupees" type="number" min="1" step="1" required />
			</label>
			<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white sm:col-span-2" type="submit">Add class</button>
		</form>
	{/if}
	<Alert message={form?.message} />
	{#if form?.saved}<p class="px-3 text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
	{#if selectedSession}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[640px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">#</th><th>Class</th><th>Section</th><th>Total Students</th><th>Fees</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each sessionClasses as room, index (room.id)}
					{@const count = data.students.filter((student) => student.classId === room.id).length}
					<tr class="border-t border-slate-100 {selected?.id === room.id ? 'bg-blue-50/40' : ''}">
						<td class="px-3 py-3">{index + 1}</td>
						<td><a class="font-semibold" href={href({ class: room.id, add: '' })}>{room.name}</a></td>
						<td>{room.sectionName || room.name}</td>
						<td>{count}</td>
						<td>{room.feeRupees == null ? '—' : `₹${room.feeRupees}`}</td>
						<td><span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">Active</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="6">No class in this session yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{/if}
	{#snippet side()}
		{#if adding || !selected}
			<h2 class="font-bold">Add Class</h2>
			<form class="mt-3 grid gap-2" method="post" action="?/class">
				{#if form?.invitePath}
					<p class="text-sm">Teacher setup link: <a class="text-blue-700" href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}>{form.invitePath}</a></p>
				{/if}
				{#if data.sessions.length > 0}
					<label class="grid gap-1 text-sm">Session
						<select class="rounded-lg border px-2 py-2" name="sessionId">
							{#each data.sessions as session (session.id)}
								<option value={session.id} selected={session.id === selectedSessionId}>{session.name}</option>
							{/each}
						</select>
					</label>
				{/if}
				<Field label={data.sessions.length > 0 ? 'New session' : 'Session'} name="sessionName" required={data.sessions.length === 0} maxlength={40} placeholder="2026-27" />
				<Field label="Class name" name="name" required maxlength={80} />
				<label class="grid gap-1 text-sm">Fees in rupees
					<input class="rounded-lg border px-2 py-2" name="feeRupees" type="number" min="1" step="1" required />
				</label>
				<Field label="Teacher email" name="teacherEmail" type="email" />
				<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Add class</button>
			</form>
		{:else}
			<div class="flex items-start justify-between">
				<div>
					<p class="font-bold">Class {selected.name}</p>
					<p class="text-xs text-slate-500">Section {selected.sectionName || selected.name} · {selectedSession?.name}</p>
				</div>
				<a class="text-slate-400" href={href({ class: '' })} aria-label="Close">×</a>
			</div>
			<p class="mt-3 text-sm">{classStudents.length} students · {selected.feeRupees == null ? 'No fee plan' : `₹${selected.feeRupees}`}</p>
			<ul class="mt-2 max-h-40 space-y-1 overflow-auto text-sm">
				{#each classStudents as student (`${student.admissionNo}-${student.firstName}`)}
					<li>{student.firstName} {student.lastName} · {student.admissionNo}</li>
				{:else}
					<li class="text-slate-500">No students yet.</li>
				{/each}
			</ul>
			<form class="mt-4 grid gap-2" method="post" action="?session={selected.sessionId}&class={selected.id}&/student">
				<h3 class="text-sm font-semibold">Add student</h3>
				{#if form?.studentInvitePath}<p class="text-xs">Setup link: {form.studentInvitePath}</p>{/if}
				<input type="hidden" name="classId" value={selected.id} />
				<Field label="Admission number" name="admissionNo" required />
				<Field label="First name" name="firstName" required />
				<Field label="Last name" name="lastName" required />
				<Field label="Student email" name="email" type="email" required />
				<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Add student</button>
			</form>
			<form class="mt-4 grid gap-2" method="post" action="?session={selected.sessionId}&class={selected.id}&/timetable" enctype="multipart/form-data">
				<h3 class="text-sm font-semibold">Timetable file</h3>
				<input type="hidden" name="classId" value={selected.id} />
				<input name="timetable" type="file" accept="application/pdf,image/png,image/jpeg" required />
				<button class="rounded-lg border px-3 py-2 text-sm" type="submit">Upload</button>
			</form>
			{#each classFiles as file (file.fileId)}
				<a class="mt-1 block text-sm text-blue-700" href={resolve('/school/academic/files/[id]', { id: file.fileId })}>Timetable file</a>
			{/each}
			<form class="mt-4 grid gap-2" method="post" action="?session={selected.sessionId}&class={selected.id}&/course" enctype="multipart/form-data">
				<h3 class="text-sm font-semibold">Course file</h3>
				<input type="hidden" name="classId" value={selected.id} />
				<input name="course" type="file" accept="application/pdf,image/png,image/jpeg" required />
				<button class="rounded-lg border px-3 py-2 text-sm" type="submit">Upload</button>
			</form>
			{#each classCourses as course (`${course.title}-${course.fileId}`)}
				{#if course.fileId}
					<a class="mt-1 block text-sm text-blue-700" href={resolve('/school/academic/files/[id]', { id: course.fileId })}>{course.title}</a>
				{/if}
			{/each}
		{/if}
	{/snippet}
</RecordPage>
