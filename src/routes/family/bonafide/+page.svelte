<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PanelPage title="Library" detail="Certificates and documents for your record">
	<Alert message={form?.message} />
	{#if form?.saved}
		<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
	{/if}
	{#if data.selected}
		<form class="grid gap-3 rounded-3xl bg-white p-5 shadow-sm" method="post">
			<input type="hidden" name="studentId" value={data.selected.id} />
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Certificate</span>
				<select class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="docType">
					<option value="Bonafide">Bonafide</option>
					<option value="Character certificate">Character certificate</option>
					<option value="Transfer certificate">Transfer certificate</option>
				</select>
			</label>
			<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
				Request
			</button>
		</form>
	{/if}
	{#if data.documents.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No request yet.</p>
	{:else}
		<ul class="grid gap-2">
			{#each data.documents as request (request.id)}
				<li class="rounded-3xl bg-white p-4 shadow-sm">
					<p class="font-semibold text-slate-900">{request.docType}</p>
					<p class="text-sm text-slate-500 capitalize">{request.status}</p>
					{#if request.reviewNote}
						<p class="mt-2 text-sm text-slate-700">{request.reviewNote}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</PanelPage>
