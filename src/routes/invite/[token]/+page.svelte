<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
	<h1 class="text-2xl font-semibold">Activate account</h1>
	<p class="text-sm text-stone-600">
		{data.invitation.email} is invited to {data.invitation.schoolName} as {data.invitation.roleKey}.
	</p>
	<Alert message={form?.message} />
	<form class="grid gap-3" method="post">
		<Field label="Full name" name="fullName" required />
		<Field label="Password" name="password" type="password" minlength={10} required />
		<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Activate</button>
	</form>
</main>
