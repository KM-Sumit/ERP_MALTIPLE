<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Documents</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.requests.length === 0}
	<p class="mt-4 text-sm text-stone-600">No document requests.</p>
{:else}
	<ul class="mt-4 grid gap-3">
		{#each data.requests as request (request.id)}
			<li class="rounded-md border bg-white p-3">
				<p class="font-medium">{request.docType}</p>
				<p class="text-sm text-stone-600">{request.status}</p>
				{#if request.status === 'ready'}
					<a class="text-sm underline" href={resolve('/school/documents/[id]', { id: request.id })}
						>Download PDF</a
					>
				{/if}
				<form class="mt-2 grid gap-2" method="post">
					<input type="hidden" name="requestId" value={request.id} />
					<label class="text-sm"
						>Decision
						<select class="rounded border px-2 py-1" name="status">
							<option value="ready">ready</option>
							<option value="rejected">rejected</option>
						</select>
					</label>
					<label class="text-sm"
						>Reason
						<input class="w-full rounded border px-2 py-1" name="note" required />
					</label>
					<button class="w-fit rounded-md border px-3 py-1 text-sm" type="submit">Save</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
