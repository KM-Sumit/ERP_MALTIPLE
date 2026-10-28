<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Policies</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
<form class="mt-4 grid max-w-xl gap-3" method="post">
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Attendance</span>
		<textarea class="rounded-md border px-3 py-2" name="attendancePolicy" rows="3" required
			>{data.settings?.attendancePolicy}</textarea
		>
	</label>
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Grading</span>
		<textarea class="rounded-md border px-3 py-2" name="gradingPolicy" rows="3" required
			>{data.settings?.gradingPolicy}</textarea
		>
	</label>
	<Field
		label="Late fee grace days"
		name="lateFeeGraceDays"
		type="number"
		min="0"
		value={data.settings?.lateFeeGraceDays ?? 0}
	/>
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Save policies</button>
</form>
