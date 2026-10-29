<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PanelPage title="Messages" detail="Send a complaint and see earlier ones">
	<Alert message={form?.message} />
	{#if form?.saved}
		<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
	{/if}
	{#if data.selected}
		<form class="grid gap-3 rounded-3xl bg-white p-5 shadow-sm" method="post" enctype="multipart/form-data">
			<input type="hidden" name="studentId" value={data.selected.id} />
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Category</span>
				<select class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="category">
					<option value="general">General</option>
					<option value="fees">Fees</option>
					<option value="academic">Academic</option>
					<option value="transport">Transport</option>
				</select>
			</label>
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Subject</span>
				<input class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="subject" required />
			</label>
			<label class="grid gap-1 text-sm">
				<span class="font-medium text-slate-700">Message</span>
				<textarea class="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="body" required></textarea>
			</label>
			<input type="hidden" name="priority" value="normal" />
			<label class="text-sm text-slate-600">Photo <input class="mt-1 block w-full text-sm" type="file" name="photo" accept="image/jpeg,image/png" /></label>
			<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">Send complaint</button>
		</form>
	{/if}
	{#if data.complaints.length === 0}
		<p class="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">No complaints yet.</p>
	{:else}
		<ul class="grid gap-2">
			{#each data.complaints as complaint (complaint.id)}
				<li class="rounded-3xl bg-white p-4 shadow-sm">
					<p class="font-semibold text-slate-900">{complaint.subject}</p>
					<p class="text-sm text-slate-500 capitalize">{complaint.status.replaceAll('_', ' ')}</p>
					{#if complaint.resolutionNote}
						<p class="mt-2 text-sm text-slate-700">{complaint.resolutionNote}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</PanelPage>
