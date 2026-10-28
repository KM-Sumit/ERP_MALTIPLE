<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
	<h1 class="text-2xl font-semibold">Choose a new password</h1>
	{#if form?.reset}
		<p role="status">Password updated. Previous sessions were signed out.</p>
		<a class="text-teal-800" href={resolve('/login')}>Log in</a>
	{:else}
		<Alert message={form?.message} />
		<form class="grid gap-3" method="post">
			<input type="hidden" name="token" value={data.token} />
			<Field label="New password" name="password" type="password" minlength={10} required />
			<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
				>Update password</button
			>
		</form>
	{/if}
</main>
