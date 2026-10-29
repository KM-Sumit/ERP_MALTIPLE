<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Super Admin</title>
</svelte:head>

<section class="rounded-3xl bg-white p-5 shadow-sm">
	<h1 class="text-xl font-semibold text-slate-900">Add school</h1>
	<p class="mt-1 text-sm text-slate-500">
		School name, how many students it can take, and the principal who will be its admin.
	</p>
	<a
		class="mt-4 flex items-center justify-between rounded-2xl bg-teal-800 px-4 py-3 font-semibold text-white"
		href={resolve('/admin/schools')}
	>
		<span>Schools</span>
		<span>{data.total}</span>
	</a>
	<form class="mt-4 grid gap-3" method="post">
		<Alert message={form?.message} />
		{#if form?.saved}
			<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
		{/if}
		{#if form?.invitePath}
			<p class="text-sm text-slate-700">
				Principal setup link:
				<a
					class="font-medium text-teal-800"
					href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}
					>{form.invitePath}</a
				>
			</p>
		{/if}
		<label class="grid gap-1.5 text-sm">
			<span class="font-medium text-slate-700">School name</span>
			<input
				class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-700 focus:bg-white"
				name="name"
				required
				maxlength="120"
				placeholder="Green Valley School"
			/>
		</label>
		<label class="grid gap-1.5 text-sm">
			<span class="font-medium text-slate-700">Student count</span>
			<input
				class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-700 focus:bg-white"
				name="seats"
				type="number"
				min="1"
				max="100000"
				required
				placeholder="200"
			/>
			<span class="text-xs text-slate-500">The school cannot add more students than this.</span>
		</label>
		<label class="grid gap-1.5 text-sm">
			<span class="font-medium text-slate-700">Principal email</span>
			<input
				class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-700 focus:bg-white"
				name="email"
				type="email"
				required
				placeholder="principal@school.com"
			/>
		</label>
		<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
			Add school
		</button>
	</form>
</section>
