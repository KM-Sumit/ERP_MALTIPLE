<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const active = $derived(
		data.schools.filter(
			(school) => school.schoolStatus === 'active' && school.membershipStatus === 'active'
		)
	);
	const blocked = $derived(data.schools.filter((school) => !active.includes(school)));
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
	<h1 class="text-2xl font-semibold">Choose a school</h1>
	<Alert message={form?.message} />
	{#if active.length === 0}
		<p>No active school is available. A suspended school cannot be opened.</p>
	{/if}
	<ul class="grid gap-2">
		{#each active as school (school.schoolId)}
			<li>
				<form method="post">
					<input type="hidden" name="schoolId" value={school.schoolId} />
					<button
						class="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-left"
						type="submit"
					>
						<span class="block font-medium">{school.schoolName}</span>
						<span class="text-sm text-stone-500">{school.roleKey}</span>
					</button>
				</form>
			</li>
		{/each}
	</ul>
	{#if blocked.length > 0}
		<h2 class="text-sm font-medium text-stone-500">Unavailable</h2>
		<ul class="text-sm text-stone-600">
			{#each blocked as school (school.schoolId + school.roleKey)}
				<li>{school.schoolName} — {school.schoolStatus}, membership {school.membershipStatus}</li>
			{/each}
		</ul>
	{/if}
</main>
