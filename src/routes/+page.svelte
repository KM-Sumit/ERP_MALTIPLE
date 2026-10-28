<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
	<h1 class="text-3xl font-semibold text-stone-900">School ERP</h1>
	<p class="text-stone-600">Sign in to manage a school, teach a class, or follow a child.</p>
	<div class="flex gap-3">
		<a class="rounded-md bg-teal-800 px-4 py-2 text-white" href={resolve('/login')}>Log in</a>
		{#if data.needsSetup}
			<a class="rounded-md border border-stone-300 px-4 py-2" href={resolve('/setup')}
				>Create the platform admin</a
			>
		{/if}
	</div>
</main>
