<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Operations</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
<form class="mt-4 grid max-w-lg gap-3" method="post">
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Status</span>
		<select class="rounded-md border border-stone-300 px-3 py-2" name="status">
			<option value="operational" selected={data.operations.status === 'operational'}
				>operational</option
			>
			<option value="disrupted" selected={data.operations.status === 'disrupted'}>disrupted</option>
		</select>
	</label>
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Message</span>
		<textarea class="rounded-md border border-stone-300 px-3 py-2" name="message" rows="3"
			>{data.operations.message ?? ''}</textarea
		>
	</label>
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Save</button>
</form>
