<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const pages = $derived(Math.max(1, Math.ceil(data.total / data.limit)));
</script>

<h1 class="text-2xl font-semibold">Schools</h1>
<form
	class="mt-4 grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-3"
	method="get"
>
	<Field label="Search" name="q" value={data.query.q} />
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Status</span>
		<select class="rounded-md border border-stone-300 px-3 py-2" name="status">
			{#each ['all', 'active', 'suspended', 'archived'] as status (status)}
				<option value={status} selected={data.query.status === status}>{status}</option>
			{/each}
		</select>
	</label>
	<button class="self-end rounded-md bg-stone-900 px-4 py-2 text-white" type="submit">Filter</button
	>
</form>

{#if data.items.length === 0}
	<p class="mt-4 text-sm text-stone-600">No schools match this filter.</p>
{:else}
	<ul class="mt-4 divide-y rounded-md border border-stone-200 bg-white">
		{#each data.items as school (school.id)}
			<li>
				<a
					class="flex items-center justify-between px-4 py-3"
					href={resolve('/admin/schools/[id]', { id: school.id })}
				>
					<span>
						<span class="block font-medium">{school.name}</span>
						<span class="text-sm text-stone-500">{school.code}</span>
					</span>
					<span class="text-sm">{school.status}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
{#if pages > 1}
	<nav class="mt-3 flex gap-2" aria-label="Pagination">
		{#each Array.from({ length: pages }, (_, index) => index + 1) as page (page)}
			<a
				class="rounded border px-3 py-1 {page === data.query.page
					? 'bg-stone-900 text-white'
					: 'bg-white'}"
				href={resolve(
					`/admin/schools?q=${encodeURIComponent(data.query.q)}&status=${data.query.status}&page=${page}`
				)}
			>
				{page}
			</a>
		{/each}
	</nav>
{/if}

<section class="mt-8">
	<h2 class="text-lg font-medium">Create a school</h2>
	<Alert message={form?.message} />
	<form class="mt-3 grid gap-3 md:grid-cols-2" method="post">
		<Field label="School name" name="name" required />
		<Field label="School code" name="code" required pattern={'[a-z0-9-]{2,32}'} />
		<button class="rounded-md bg-teal-800 px-4 py-2 text-white md:col-span-2" type="submit">
			Create school
		</button>
	</form>
</section>
