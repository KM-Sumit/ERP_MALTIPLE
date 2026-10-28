<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">School profile</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.settings?.logoPath}
	<img class="mt-4 h-16 w-16 rounded object-cover" src={data.settings.logoPath} alt="School logo" />
{/if}
<form class="mt-4 grid max-w-xl gap-3" method="post">
	<Field label="School name" name="name" value={data.school?.name ?? ''} required />
	<Field label="Address" name="address" value={data.settings?.address ?? ''} />
	<Field
		label="Theme color"
		name="themeColor"
		value={data.settings?.themeColor ?? '#0f766e'}
		required
	/>
	<Field label="Logo URL" name="logoPath" type="url" value={data.settings?.logoPath ?? ''} />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Save profile</button>
</form>
