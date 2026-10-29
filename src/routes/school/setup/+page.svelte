<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const step = $derived(data.home.onboarding?.step ?? 'profile');
	const settings = $derived(data.home.settings);
	const school = $derived(data.home.school);
</script>

<h1 class="text-2xl font-semibold">School setup</h1>
<ol class="mt-3 flex flex-wrap gap-2 text-xs">
	{#each data.steps as name (name)}
		<li class="rounded-full px-2 py-1 {name === step ? 'bg-teal-800 text-white' : 'bg-stone-200'}">
			{name}
		</li>
	{/each}
</ol>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.home.onboarding?.completedAt}
	<p class="mt-4 text-sm">Setup is complete. Profile and policy pages remain available.</p>
{/if}

<form class="mt-4 grid max-w-xl gap-3" method="post">
	<input type="hidden" name="step" value={step} />
	{#if step === 'profile'}
		<Field label="School name" name="name" value={school?.name ?? ''} required />
		<Field
			label="Contact email"
			name="contactEmail"
			type="email"
			value={settings?.contactEmail ?? ''}
		/>
		<Field label="Contact phone" name="contactPhone" value={settings?.contactPhone ?? ''} />
	{:else if step === 'address'}
		<Field label="Address" name="address" value={settings?.address ?? ''} />
		<Field
			label="Theme color"
			name="themeColor"
			value={settings?.themeColor ?? '#0f766e'}
			required
		/>
		<Field label="Logo URL" name="logoPath" type="url" value={settings?.logoPath ?? ''} />
	{:else if step === 'session'}
		<Field label="Session name" name="sessionName" required />
		<Field label="Start date" name="startDate" type="date" required />
		<Field label="End date" name="endDate" type="date" required />
	{:else if step === 'classes'}
		<Field label="Class name" name="className" required />
		<Field label="Section" name="sectionName" required />
		<Field label="Subject" name="subjectName" required />
		<Field label="Subject code" name="subjectCode" required />
	{:else if step === 'staff'}
		<p class="text-sm text-stone-600">
			Invite staff from the Staff page. Continue when you are ready.
		</p>
	{:else if step === 'policies'}
		<Field
			label="Attendance policy"
			name="attendancePolicy"
			value={settings?.attendancePolicy ?? ''}
			required
		/>
		<Field
			label="Grading policy"
			name="gradingPolicy"
			value={settings?.gradingPolicy ?? ''}
			required
		/>
	{:else if step === 'fees'}
		<Field label="Fee name" name="feeName" />
		<Field label="Amount in rupees" name="amountRupees" type="number" min="0" step="0.01" />
	{:else if step === 'locale'}
		<Field
			label="Time zone"
			name="timezone"
			value={settings?.timezone ?? 'Asia/Kolkata'}
			required
		/>
		<Field
			label="Currency"
			name="currency"
			value={settings?.currency ?? 'INR'}
			minlength={3}
			maxlength={3}
			required
		/>
		<Field label="Locale" name="locale" value={settings?.locale ?? 'en-IN'} required />
	{:else}
		<p class="text-sm">Review the school profile, then mark setup complete.</p>
	{/if}
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
		>Save and continue</button
	>
</form>
