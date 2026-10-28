<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const view = $derived(data.school);
</script>

<h1 class="text-2xl font-semibold">{view.school.name}</h1>
<p class="text-sm text-stone-500">{view.school.code} · {view.school.status}</p>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if form?.invitePath}
	<p role="status" class="mt-2 text-sm">
		Invitation link, shown once because email delivery is not configured:
		<a
			class="text-teal-800"
			href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}
			>{form.invitePath}</a
		>
	</p>
{/if}

<section class="mt-6 grid gap-3 md:grid-cols-4">
	{#each Object.entries(view.usage ?? {}) as [key, value] (key)}
		<div class="rounded-md border border-stone-200 bg-white p-3">
			<p class="text-xs text-stone-500 uppercase">{key}</p>
			<p class="text-xl font-semibold">{value}</p>
		</div>
	{/each}
</section>

<section class="mt-6 rounded-md border border-stone-200 bg-white p-4">
	<h2 class="font-medium">School admins</h2>
	{#if view.admins.length === 0}
		<p class="mt-2 text-sm text-stone-600">No school admin has been provisioned.</p>
	{:else}
		<ul class="mt-2 text-sm">
			{#each view.admins as admin (`${admin.email}-${admin.status}`)}
				<li>{admin.full_name} · {admin.email} · {admin.status}</li>
			{/each}
		</ul>
	{/if}
	<form class="mt-4 grid gap-3 md:grid-cols-2" method="post" action="?/admin">
		<Field label="Admin name" name="fullName" required />
		<Field label="Admin email" name="email" type="email" required />
		<button class="rounded-md bg-teal-800 px-4 py-2 text-white md:col-span-2" type="submit">
			Provision school admin
		</button>
	</form>
</section>

<section class="mt-6 rounded-md border border-stone-200 bg-white p-4">
	<h2 class="font-medium">Status</h2>
	<p class="mt-1 text-sm text-stone-600">
		Onboarding: {view.onboarding?.step ?? 'not started'}
		{view.onboarding?.completedAt ? '(complete)' : '(in progress)'}
	</p>
	<form class="mt-3 grid gap-3 md:grid-cols-3" method="post" action="?/status">
		<label class="grid gap-1 text-sm">
			<span class="font-medium">Next status</span>
			<select class="rounded-md border border-stone-300 px-3 py-2" name="status">
				<option value="active">active</option>
				<option value="suspended">suspended</option>
				<option value="archived">archived</option>
			</select>
		</label>
		<Field label="Type the school code to confirm" name="confirmation" required />
		<button class="self-end rounded-md bg-stone-900 px-4 py-2 text-white" type="submit"
			>Update status</button
		>
	</form>
</section>

<section class="mt-6 rounded-md border border-stone-200 bg-white p-4">
	<h2 class="font-medium">Plan and student limit</h2>
	<form class="mt-3 grid gap-3 md:grid-cols-2" method="post" action="?/limits">
		<Field label="Plan" name="planKey" value={view.settings?.planKey ?? 'standard'} required />
		<Field
			label="Student limit"
			name="studentLimit"
			type="number"
			min="0"
			value={view.settings?.studentLimit ?? ''}
		/>
		<button class="rounded-md bg-teal-800 px-4 py-2 text-white md:col-span-2" type="submit"
			>Save limits</button
		>
	</form>
</section>
