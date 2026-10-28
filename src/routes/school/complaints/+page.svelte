<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Complaints</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.complaints.length === 0}
	<p class="mt-4 text-sm text-stone-600">No complaints.</p>
{:else}
	<ul class="mt-4 grid gap-3">
		{#each data.complaints as complaint (complaint.id)}
			<li class="rounded-md border bg-white p-3">
				<p class="font-medium">{complaint.subject}</p>
				<p class="text-sm text-stone-600">
					{complaint.category} · {complaint.priority} · {complaint.status}
				</p>
				<p class="mt-1 text-sm">{complaint.body}</p>
				<form class="mt-2 grid gap-2" method="post">
					<input type="hidden" name="complaintId" value={complaint.id} />
					<label class="text-sm"
						>Status
						<select class="rounded border px-2 py-1" name="status">
							<option>in_review</option>
							<option>assigned</option>
							<option>resolved</option>
							<option>closed</option>
						</select>
					</label>
					<label class="text-sm"
						>Note
						<input
							class="w-full rounded border px-2 py-1"
							name="note"
							value={complaint.resolutionNote ?? ''}
						/>
					</label>
					<button class="w-fit rounded-md border px-3 py-1 text-sm" type="submit">Update</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
