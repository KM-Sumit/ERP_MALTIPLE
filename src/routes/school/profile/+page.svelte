<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const links = [
		{ href: resolve('/school/profile'), label: 'General Settings' },
		{ href: resolve('/school/policies'), label: 'Policies' },
		{ href: resolve('/school/staff'), label: 'User Management' },
		{ href: resolve('/school/notices'), label: 'Notices' },
		{ href: resolve('/school/audit'), label: 'Audit' }
	];
</script>

<RecordPage crumb="Dashboard  /  Settings" title="Settings" detail="Manage school settings and academic year">
	{#snippet actions()}
		<button class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit" form="school-settings">Save Changes</button>
	{/snippet}
	<div class="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
		<nav class="space-y-1 text-sm">
			{#each links as link (link.href)}
				<a class="block rounded-lg px-3 py-2 {link.href === resolve('/school/profile') ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600'}" href={link.href}>{link.label}</a>
			{/each}
		</nav>
		<form id="school-settings" class="grid gap-3" method="post">
			<Alert message={form?.message} />
			{#if form?.saved}<p class="text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
			<h2 class="font-semibold">School Information</h2>
			{#if data.settings?.logoPath}
				<img class="h-16 w-16 rounded-xl object-cover" src={data.settings.logoPath} alt="School logo" />
			{/if}
			<Field label="School name" name="name" value={data.school?.name ?? ''} required />
			<Field label="Address" name="address" value={data.settings?.address ?? ''} />
			<Field label="Theme color" name="themeColor" value={data.settings?.themeColor ?? '#0f766e'} required />
			<Field label="Logo URL" name="logoPath" type="url" value={data.settings?.logoPath ?? ''} />
			{#if data.notices}
				<p class="text-sm text-slate-500">{data.notices.length} recent notices are published from Events & Notices.</p>
			{/if}
		</form>
	</div>
</RecordPage>
