<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Notices</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.notices.length === 0}
	<p class="mt-4 text-sm text-stone-600">No notices yet.</p>
{:else}
	<ul class="mt-4 grid gap-2">
		{#each data.notices as notice (notice.id)}
			<li class="rounded-md border bg-white p-3">
				<p class="font-medium">{notice.title}</p>
				<p class="text-sm">{notice.body}</p>
			</li>
		{/each}
	</ul>
{/if}
<form class="mt-4 grid max-w-xl gap-3" method="post">
	<Field label="Title" name="title" required />
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Body</span>
		<textarea class="rounded-md border px-3 py-2" name="body" rows="4" required></textarea>
	</label>
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Publish</button>
</form>
