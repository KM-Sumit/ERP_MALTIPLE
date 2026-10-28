<script lang="ts">
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
	<h1 class="text-2xl font-semibold">Reset password</h1>
	{#if form?.sent}
		<p role="status" class="text-sm text-stone-700">
			If an account exists for that email, a reset has been prepared. Email delivery is not
			configured, so an administrator must complete recovery from the server test tools.
		</p>
	{:else}
		<form class="grid gap-3" method="post">
			<Field label="Email" name="email" type="email" required />
			<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
				>Request reset</button
			>
		</form>
	{/if}
	<a class="text-sm text-teal-800" href={resolve('/login')}>Back to login</a>
</main>
