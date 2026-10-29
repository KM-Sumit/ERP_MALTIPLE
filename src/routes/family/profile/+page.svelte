<script lang="ts">
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const name = $derived(data.selected ? `${data.selected.firstName} ${data.selected.lastName}` : 'Student');
</script>

<PanelPage title="My Profile" detail="View and manage your personal information">
	<section class="grid gap-4 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-2">
		<div>
			<p class="text-xs font-semibold text-slate-400">Personal Information</p>
			<h2 class="mt-2 text-xl font-bold">{name}</h2>
			<dl class="mt-4 grid gap-3 text-sm">
				<div><dt class="text-xs text-slate-400">Full name</dt><dd>{name}</dd></div>
				<div><dt class="text-xs text-slate-400">Date of birth</dt><dd>{data.selected?.dateOfBirth || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Email</dt><dd class="break-all">{data.email || '—'}</dd></div>
			</dl>
		</div>
		<div>
			<p class="text-xs font-semibold text-slate-400">Academic Information</p>
			<dl class="mt-4 grid gap-3 text-sm">
				<div><dt class="text-xs text-slate-400">Admission no.</dt><dd>{data.selected?.admissionNo || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Class</dt><dd>{data.placement?.className || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Section</dt><dd>{data.placement?.sectionName || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Roll no.</dt><dd>{data.placement?.rollNumber || '—'}</dd></div>
				<div><dt class="text-xs text-slate-400">Session</dt><dd>{data.placement?.sessionName || '—'}</dd></div>
			</dl>
		</div>
	</section>
</PanelPage>
