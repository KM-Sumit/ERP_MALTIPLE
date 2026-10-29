<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const query = $derived(page.url.searchParams.get('q')?.trim().toLowerCase() ?? '');
	const tab = $derived(page.url.searchParams.get('tab') ?? 'all');
	const classFilter = $derived(page.url.searchParams.get('class') ?? '');
	const pageNo = $derived(Math.max(1, Number(page.url.searchParams.get('page') ?? '1') || 1));
	const adding = $derived(page.url.searchParams.get('add') === '1');
	const monthStart = Date.now() - 31 * 24 * 60 * 60 * 1000;
	const filtered = $derived(
		data.roster.filter((student) => {
			const created = Date.parse(student.createdAt);
			if (tab === 'active' && student.status !== 'active') return false;
			if (tab === 'new' && !(created >= monthStart)) return false;
			if (tab === 'alumni' && student.status !== 'alumni') return false;
			if (tab === 'withdrawn' && student.status !== 'withdrawn') return false;
			if (classFilter && student.className !== classFilter) return false;
			const haystack = `${student.firstName} ${student.lastName} ${student.admissionNo} ${student.className} ${student.sectionName} ${student.email}`.toLowerCase();
			return !query || haystack.includes(query);
		})
	);
	const pageSize = 10;
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const visible = $derived(filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize));
	const selectedId = $derived(page.url.searchParams.get('id') ?? (!adding ? filtered[0]?.id : ''));
	const selected = $derived(data.roster.find((student) => student.id === selectedId) ?? null);
	const classes = $derived([...new Set(data.roster.map((student) => student.className).filter(Boolean))]);
	const activeCount = $derived(data.roster.filter((student) => student.status === 'active').length);
	const newCount = $derived(data.roster.filter((student) => Date.parse(student.createdAt) >= monthStart).length);
	const alumniCount = $derived(data.roster.filter((student) => student.status === 'alumni').length);

	function href(extra: Record<string, string>) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(extra)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const text = params.toString();
		return text ? `${resolve('/school/people')}?${text}` : resolve('/school/people');
	}
	function initials(name: string) {
		return name.split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
	}
</script>

<RecordPage
	crumb="Dashboard  /  Students"
	title="Students"
	detail="Manage all students, admissions, and student records"
	stats={[
		{ label: 'Total Students', value: String(data.roster.length), note: `${newCount} this month`, tone: 'bg-[#eef4ff]' },
		{ label: 'New Admissions', value: String(newCount), note: 'Joined in the last 31 days', tone: 'bg-[#e9fbf3]' },
		{ label: 'Active Students', value: String(activeCount), note: data.roster.length ? `${Math.round((activeCount / data.roster.length) * 100)}% of total` : 'No students yet', tone: 'bg-[#f3eefe]' },
		{ label: 'Alumni', value: String(alumniCount), note: 'Left the school', tone: 'bg-[#fff8e8]' }
	]}
	tabs={[
		{ href: href({ tab: '', page: '' }), label: 'All Students', active: tab === 'all' },
		{ href: href({ tab: 'active', page: '' }), label: 'Active', active: tab === 'active' },
		{ href: href({ tab: 'new', page: '' }), label: 'New Admissions', active: tab === 'new' },
		{ href: href({ tab: 'withdrawn', page: '' }), label: 'Withdrawn', active: tab === 'withdrawn' },
		{ href: href({ tab: 'alumni', page: '' }), label: 'Alumni', active: tab === 'alumni' }
	]}
>
	{#snippet actions()}
		<a class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" href={resolve('/school/reports/export')}>Export</a>
		<a class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={href({ add: '1', id: '' })}>+ Add Student</a>
	{/snippet}
	<div class="flex flex-wrap gap-2 border-b border-slate-100 p-3">
		<select class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" onchange={(event) => { location.href = href({ class: event.currentTarget.value, page: '' }); }}>
			<option value="">Select Class</option>
			{#each classes as name (name)}
				<option value={name} selected={name === classFilter}>{name}</option>
			{/each}
		</select>
	</div>
	<Alert message={form?.message} />
	{#if form?.saved}<p class="px-3 text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
	{#if form?.studentInvitePath}
		<p class="px-3 text-sm">Student setup link: <a class="text-blue-700" href={resolve('/invite/[token]', { token: form.studentInvitePath.split('/').pop() ?? '' })}>{form.studentInvitePath}</a></p>
	{/if}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[720px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr>
					<th class="px-3 py-3">#</th>
					<th>Student</th>
					<th>Admission No.</th>
					<th>Class</th>
					<th>Section</th>
					<th>Parent/Guardian</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each visible as student, index (student.id)}
					<tr class="border-t border-slate-100 {selected?.id === student.id ? 'bg-blue-50/50' : ''}">
						<td class="px-3 py-3">{(pageNo - 1) * pageSize + index + 1}</td>
						<td>
							<a class="font-semibold" href={href({ id: student.id, add: '' })}>{student.firstName} {student.lastName}</a>
							<p class="text-xs text-slate-400">{student.email}</p>
						</td>
						<td>{student.admissionNo}</td>
						<td>{student.className || '—'}</td>
						<td>{student.sectionName || '—'}</td>
						<td>
							{student.guardianName || '—'}
							<p class="text-xs text-slate-400">{student.guardianEmail}</p>
						</td>
						<td><span class="rounded-full px-2 py-0.5 text-xs font-semibold {student.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">{student.status}</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="7">No students match this view.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="flex items-center justify-between px-3 py-3 text-xs text-slate-500">
		<span>Showing {filtered.length === 0 ? 0 : (pageNo - 1) * pageSize + 1} to {Math.min(pageNo * pageSize, filtered.length)} of {filtered.length}</span>
		<span class="flex gap-1">
			{#each Array.from({ length: pageCount }, (_, index) => index + 1) as number (number)}
				<a class="grid h-7 w-7 place-items-center rounded {number === pageNo ? 'bg-[#2f6bff] text-white' : 'bg-slate-100'}" href={href({ page: String(number) })}>{number}</a>
			{/each}
		</span>
	</p>
	{#snippet side()}
		{#if adding || !selected}
			<h2 class="font-bold">Add Student</h2>
			<form class="mt-3 grid gap-2" method="post" action="?/student">
				<Field label="Admission number" name="admissionNo" required />
				<Field label="First name" name="firstName" required />
				<Field label="Last name" name="lastName" required />
				<Field label="Student email" name="email" type="email" required />
				<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Save student</button>
			</form>
			<form class="mt-5 grid gap-2 border-t border-slate-100 pt-4" method="post" action="?/guardian">
				<h3 class="text-sm font-semibold">Link a parent</h3>
				<select class="rounded-lg border px-2 py-2 text-sm" name="studentId" required>
					{#each data.roster as student (student.id)}
						<option value={student.id}>{student.firstName} {student.lastName}</option>
					{/each}
				</select>
				<Field label="Parent name" name="fullName" required />
				<Field label="Parent email" name="email" type="email" required />
				<button class="rounded-lg border px-3 py-2 text-sm" type="submit">Create parent invitation</button>
			</form>
			{#if form?.invitePath}
				<p class="mt-2 text-sm">Parent link: {form.invitePath}</p>
			{/if}
		{:else}
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<span class="grid h-12 w-12 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{initials(`${selected.firstName} ${selected.lastName}`)}</span>
					<div>
						<p class="font-bold">{selected.firstName} {selected.lastName}</p>
						<p class="text-xs text-emerald-600">{selected.status}</p>
					</div>
				</div>
				<a class="text-slate-400" href={href({ id: '' })} aria-label="Close">×</a>
			</div>
			<dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
				<div><dt class="text-xs text-slate-400">Admission No.</dt><dd>{selected.admissionNo}</dd></div>
				<div><dt class="text-xs text-slate-400">Class</dt><dd>{selected.className || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Section</dt><dd>{selected.sectionName || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Roll No.</dt><dd>{selected.rollNumber || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Date of birth</dt><dd>{selected.dateOfBirth || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Email</dt><dd class="break-all">{selected.email || '—'}</dd></div>
				<div class="col-span-2"><dt class="text-xs text-slate-400">Parent / guardian</dt><dd>{selected.guardianName || '—'} {selected.guardianEmail}</dd></div>
			</dl>
		{/if}
	{/snippet}
</RecordPage>
