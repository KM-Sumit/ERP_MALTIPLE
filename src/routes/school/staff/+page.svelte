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
	const adding = $derived(page.url.searchParams.get('add') === '1');
	const monthStart = Date.now() - 31 * 24 * 60 * 60 * 1000;
	const filtered = $derived(
		data.teachers.filter((teacher) => {
			if (tab === 'active' && teacher.status !== 'active') return false;
			if (tab === 'invited' && teacher.status !== 'invited') return false;
			if (tab === 'suspended' && teacher.status !== 'suspended') return false;
			const haystack = `${teacher.name} ${teacher.email} ${teacher.subjects} ${teacher.phone}`.toLowerCase();
			return !query || haystack.includes(query);
		})
	);
	const selectedId = $derived(page.url.searchParams.get('id') ?? (!adding ? filtered[0]?.id : ''));
	const selected = $derived(data.teachers.find((teacher) => teacher.id === selectedId) ?? null);
	const activeCount = $derived(data.teachers.filter((teacher) => teacher.status === 'active').length);
	const newCount = $derived(data.teachers.filter((teacher) => Date.parse(teacher.createdAt) >= monthStart).length);
	const subjectCount = $derived(new Set(data.teachers.flatMap((teacher) => teacher.subjects.split(', ').filter(Boolean))).size);

	function href(extra: Record<string, string>) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(extra)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const text = params.toString();
		return text ? `${resolve('/school/staff')}?${text}` : resolve('/school/staff');
	}
	function initials(name: string) {
		return name.split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
	}
</script>

<RecordPage
	crumb="Dashboard  /  Teachers"
	title="Teachers"
	detail="Manage all teachers, subjects, and teacher records"
	stats={[
		{ label: 'Total Teachers', value: String(data.teachers.length), note: `+${newCount} this month`, tone: 'bg-[#eef4ff]' },
		{ label: 'Active Teachers', value: String(activeCount), note: data.teachers.length ? `${Math.round((activeCount / data.teachers.length) * 100)}% of total` : 'No teachers yet', tone: 'bg-[#e9fbf3]' },
		{ label: 'Subjects Covered', value: String(subjectCount), note: 'From class assignments', tone: 'bg-[#f3eefe]' },
		{ label: 'New Teachers', value: String(newCount), note: 'Joined in the last 31 days', tone: 'bg-[#fff8e8]' }
	]}
	tabs={[
		{ href: href({ tab: '' }), label: 'All Teachers', active: tab === 'all' },
		{ href: href({ tab: 'active' }), label: 'Active', active: tab === 'active' },
		{ href: href({ tab: 'invited' }), label: 'Invited', active: tab === 'invited' },
		{ href: href({ tab: 'suspended' }), label: 'Suspended', active: tab === 'suspended' }
	]}
>
	{#snippet actions()}
		<a class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={href({ add: '1', id: '' })}>+ Add Teacher</a>
	{/snippet}
	<Alert message={form?.message} />
	{#if form?.saved}<p class="px-3 text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
	{#if form?.invitePath}
		<p class="px-3 text-sm">Setup link: <a class="text-blue-700" href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}>{form.invitePath}</a></p>
	{/if}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[680px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">#</th><th>Teacher</th><th>Subject(s)</th><th>Classes</th><th>Phone</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each filtered as teacher, index (teacher.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3">{index + 1}</td>
						<td>
							<a class="font-semibold" href={href({ id: teacher.id, add: '' })}>{teacher.name}</a>
							<p class="text-xs text-slate-400">{teacher.email}</p>
						</td>
						<td>{teacher.subjects || '—'}</td>
						<td>{teacher.classes || '—'}</td>
						<td>{teacher.phone || '—'}</td>
						<td><span class="rounded-full px-2 py-0.5 text-xs font-semibold {teacher.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}">{teacher.status}</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="6">No teachers match this view.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.members.some((member) => String(member.role_key) !== 'teacher')}
		<details class="border-t border-slate-100 p-3 text-sm">
			<summary class="cursor-pointer font-semibold">Other staff</summary>
			<ul class="mt-3 grid gap-3">
				{#each data.members.filter((member) => String(member.role_key) !== 'teacher') as member (member.id)}
					<li class="rounded-xl bg-slate-50 p-3">
						<p class="font-medium">{member.full_name}</p>
						<p class="text-xs text-slate-500">{member.email} · {member.role_key} · {member.status}</p>
						{#if member.role_key === 'manager_admin'}
							<form class="mt-2 grid gap-1" method="post" action="?/permissions">
								<input type="hidden" name="membershipId" value={member.id} />
								{#each data.permissions as permission (permission)}
									<label class="flex gap-2 text-xs">
										<input type="checkbox" name="permission" value={permission} checked={data.grants.some((grant) => grant.membershipId === member.id && grant.permissionKey === permission)} />
										{permission}
									</label>
								{/each}
								<button class="mt-1 w-fit rounded-lg bg-slate-900 px-2 py-1 text-xs text-white" type="submit">Save permissions</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</details>
	{/if}
	{#snippet side()}
		{#if adding || !selected}
			<h2 class="font-bold">Add Teacher</h2>
			<form class="mt-3 grid gap-2" method="post" action="?/invite">
				<Field label="Name" name="fullName" required />
				<Field label="Email" name="email" type="email" required />
				<label class="grid gap-1 text-sm">
					<span class="font-medium">Role</span>
					<select class="rounded-lg border px-2 py-2" name="roleKey">
						<option value="teacher">Teacher</option>
						<option value="manager_admin">Manager Admin</option>
						<option value="school_admin">School Admin</option>
					</select>
				</label>
				<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Create invitation</button>
			</form>
		{:else}
			<div class="flex items-start justify-between gap-2">
				<div class="flex items-center gap-3">
					<span class="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{initials(selected.name)}</span>
					<div>
						<p class="font-bold">{selected.name}</p>
						<p class="text-xs text-slate-500">{selected.email}</p>
					</div>
				</div>
				<a class="text-slate-400" href={href({ id: '' })} aria-label="Close">×</a>
			</div>
			<dl class="mt-4 grid gap-2 text-sm">
				<div><dt class="text-xs text-slate-400">Subjects</dt><dd>{selected.subjects || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Classes</dt><dd>{selected.classes || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Phone</dt><dd>{selected.phone || '—'}</dd></div>
			</dl>
			<form class="mt-4 flex gap-2" method="post" action="?/status">
				<input type="hidden" name="membershipId" value={selected.id} />
				<select class="rounded-lg border px-2 py-1 text-sm" name="status">
					<option value="active">active</option>
					<option value="suspended">suspended</option>
				</select>
				<button class="rounded-lg border px-2 py-1 text-sm" type="submit">Update</button>
			</form>
		{/if}
	{/snippet}
</RecordPage>
