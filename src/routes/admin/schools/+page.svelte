<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Schools</title>
</svelte:head>

<section class="rounded-3xl bg-white p-5 shadow-sm">
	<h1 class="text-xl font-semibold text-slate-900">Schools</h1>
	<p class="mt-1 text-sm text-slate-500">Total schools: {data.total}</p>
	{#if data.schools.length === 0}
		<p class="mt-4 text-sm text-slate-600">No school has been added yet.</p>
	{:else}
		<ul class="mt-4 grid gap-4">
			{#each data.schools as school (school.id)}
				<li class="rounded-2xl border border-slate-200 p-4">
					<form class="grid gap-3" method="post" action="?/save">
						{#if form?.schoolId === school.id}
							<Alert message={form?.message} />
							{#if form?.saved}
								<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
							{/if}
						{/if}
						<input name="schoolId" type="hidden" value={school.id} />
						<label class="grid gap-1.5 text-sm">
							<span class="font-medium text-slate-700">School name</span>
							<input
								class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-700 focus:bg-white"
								name="name"
								required
								maxlength="120"
								value={school.name}
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
								value={school.studentLimit ?? ''}
							/>
							<span class="text-xs text-slate-500">
								{school.students} students added. The school cannot go above this count.
							</span>
						</label>
						<button
							class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white"
							type="submit"
						>
							Save
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
