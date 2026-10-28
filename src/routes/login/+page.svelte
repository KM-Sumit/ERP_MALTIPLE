<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main
	class="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center gap-4 bg-[#f6f8f7] px-6"
>
	<p class="text-sm text-slate-500">School ERP</p>
	<h1 class="text-2xl font-semibold text-slate-900">Log in</h1>
	<Alert message={form?.message} />
	<form class="grid gap-3" method="post">
		{#if form?.challenge}
			<input type="hidden" name="challenge" value={form.challenge} />
			<p class="text-sm text-stone-600">Enter the 6-digit code for {form.email}.</p>
			<Field label="Authentication code" name="code" inputmode="numeric" required />
		{:else}
			<Field label="Email" name="email" type="email" autocomplete="username" required />
			<Field
				label="Password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		{/if}
		<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit"
			>Continue</button
		>
	</form>
	<a class="text-sm text-teal-800" href={resolve('/forgot-password')}>Forgot password</a>
</main>
