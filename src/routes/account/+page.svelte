<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import Shell from '#lib/components/Shell.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const tabs = $derived([
		{ href: data.home, label: 'Home' },
		{ href: '/account', label: 'Profile' }
	]);
</script>

<Shell title="Profile" userName={data.fullName ?? 'Account'} links={tabs} {tabs}>
	<div class="grid gap-6">
		<h1 class="text-2xl font-semibold">Account</h1>
		<p class="text-sm text-stone-600">{data.fullName}</p>
		<Alert message={form?.message} />
		{#if form?.saved}<p role="status" class="text-sm text-emerald-800">{form.saved}</p>{/if}
		<form class="grid gap-3" method="post" action="?/password">
			<h2 class="font-medium">Change password</h2>
			<Field label="Current password" name="current" type="password" required />
			<Field label="New password" name="next" type="password" minlength={10} required />
			<button class="rounded-md bg-stone-900 px-4 py-2 text-white" type="submit"
				>Update and sign out</button
			>
		</form>
		<form method="post" action="?/revoke">
			<button class="rounded-md border border-red-300 px-4 py-2 text-red-800" type="submit">
				Sign out every session
			</button>
		</form>
		{#if data.privileged}
			<section class="grid gap-3">
				<h2 class="font-medium">Multi-factor authentication</h2>
				<form method="post" action="?/totp">
					<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
						>Generate a setup code</button
					>
				</form>
				{#if form?.uri}
					<p class="text-sm break-all">Add this key to an authenticator app: {form.uri}</p>
					<form class="grid gap-3" method="post" action="?/confirm">
						<Field label="6-digit code" name="code" inputmode="numeric" required />
						<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
							>Confirm code</button
						>
					</form>
				{/if}
			</section>
		{/if}
		<form method="post" action="/logout">
			<button
				class="w-full rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white"
				type="submit"
			>
				Log out
			</button>
		</form>
		<a class="text-sm text-emerald-800" href={resolve(data.home as '/')}>Back</a>
	</div>
</Shell>
