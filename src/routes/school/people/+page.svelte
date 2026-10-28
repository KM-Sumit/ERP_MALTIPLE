<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Students and parents</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if form?.invitePath}
	<p role="status" class="mt-2 text-sm">
		Parent activation link:
		<a
			class="text-teal-800"
			href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}
			>{form.invitePath}</a
		>
	</p>
{/if}
{#if data.students.length === 0}
	<p class="mt-4 text-sm text-stone-600">No students yet.</p>
{:else}
	<ul class="mt-4 text-sm">
		{#each data.students as student (student.id)}
			<li>{student.admissionNo} · {student.firstName} {student.lastName}</li>
		{/each}
	</ul>
{/if}
<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/student">
	<h2 class="font-medium">Add student</h2>
	<Field label="Admission number" name="admissionNo" required />
	<Field label="First name" name="firstName" required />
	<Field label="Last name" name="lastName" required />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Add student</button>
</form>
<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/guardian">
	<h2 class="font-medium">Link a parent</h2>
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Student</span>
		<select class="rounded-md border px-3 py-2" name="studentId" required>
			{#each data.students as student (student.id)}
				<option value={student.id}>{student.firstName} {student.lastName}</option>
			{/each}
		</select>
	</label>
	<Field label="Parent name" name="fullName" required />
	<Field label="Parent email" name="email" type="email" required />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
		>Create parent invitation</button
	>
</form>
