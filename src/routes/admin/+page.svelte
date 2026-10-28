<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import QuickGrid from '#lib/components/QuickGrid.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let bill = $state('unpaid');
	const paid = $derived(data.schools.filter((school) => school.bill === 'paid'));
	const unpaid = $derived(data.schools.filter((school) => school.bill !== 'paid'));
</script>

<svelte:head>
	<title>Schools</title>
</svelte:head>

<div class="grid gap-4">
	<QuickGrid
		title="Fast access"
		items={[
			{ href: '/admin/schools', label: 'Schools' },
			{ href: '/admin/audit', label: 'Audit' },
			{ href: '/admin/settings', label: 'Operations' },
			{ href: '/account', label: 'Profile' }
		]}
	/>

	<details class="overflow-hidden rounded-2xl bg-white shadow-sm">
		<summary class="cursor-pointer list-none px-4 py-4 text-base font-semibold text-emerald-800">
			Create school
		</summary>
		<form class="grid gap-3 px-4 pb-4" method="post" action="?/create">
			<Alert message={form?.message} />
			{#if form?.saved}
				<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
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
				<span class="font-medium text-slate-700">Children this school can take</span>
				<input
					class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-700 focus:bg-white"
					name="seats"
					type="number"
					min="1"
					max="100000"
					required
					placeholder="200"
				/>
			</label>
			<fieldset class="grid content-end gap-2 text-sm">
				<legend class="font-medium text-slate-700">Bill</legend>
				<div class="flex gap-2">
					<label
						class="flex flex-1 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3"
					>
						<input type="radio" name="bill" value="paid" bind:group={bill} required />
						Paid
					</label>
					<label
						class="flex flex-1 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3"
					>
						<input type="radio" name="bill" value="unpaid" bind:group={bill} />
						Not paid
					</label>
				</div>
			</fieldset>
			<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
				Save school
			</button>
		</form>
	</details>

	<div class="grid gap-4">
		<section class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900">Bill paid</h2>
				<span class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800"
					>{paid.length}</span
				>
			</div>
			{#if paid.length === 0}
				<p class="mt-4 text-sm text-slate-500">No school has a paid bill yet.</p>
			{:else}
				<ul class="mt-4 grid gap-3">
					{#each paid as school (school.id)}
						<li class="rounded-2xl bg-emerald-50/70 px-4 py-3">
							<p class="font-semibold text-slate-900">{school.name}</p>
							<p class="mt-1 text-sm text-slate-600">
								{school.studentLimit == null
									? 'No child limit set'
									: `Up to ${school.studentLimit} children`}
							</p>
							<form class="mt-3" method="post" action="?/bill">
								<input type="hidden" name="schoolId" value={school.id} />
								<input type="hidden" name="bill" value="unpaid" />
								<button class="text-sm font-medium text-emerald-900 underline" type="submit">
									Mark as not paid
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900">Bill not paid</h2>
				<span class="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900"
					>{unpaid.length}</span
				>
			</div>
			{#if unpaid.length === 0}
				<p class="mt-4 text-sm text-slate-500">Every school on this page has paid.</p>
			{:else}
				<ul class="mt-4 grid gap-3">
					{#each unpaid as school (school.id)}
						<li class="rounded-2xl bg-amber-50/80 px-4 py-3">
							<p class="font-semibold text-slate-900">{school.name}</p>
							<p class="mt-1 text-sm text-slate-600">
								{school.studentLimit == null
									? 'No child limit set'
									: `Up to ${school.studentLimit} children`}
							</p>
							<form class="mt-3" method="post" action="?/bill">
								<input type="hidden" name="schoolId" value={school.id} />
								<input type="hidden" name="bill" value="paid" />
								<button class="text-sm font-medium text-amber-950 underline" type="submit">
									Mark as paid
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
