<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Courses</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
<form class="mt-4 grid max-w-xl gap-3" method="post" action="?/course">
	<h2 class="font-medium">Publish a course</h2>
	<Field label="Title" name="title" required />
	<label class="text-sm"
		>Section
		<select class="w-full rounded border px-2 py-1" name="sectionId" required>
			{#each data.sections as section (section.id)}
				<option value={section.id}>{section.name}</option>
			{/each}
		</select>
	</label>
	<label class="text-sm"
		>Subject
		<select class="w-full rounded border px-2 py-1" name="subjectId" required>
			{#each data.subjects as subject (subject.id)}
				<option value={subject.id}>{subject.name}</option>
			{/each}
		</select>
	</label>
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Publish</button>
</form>
<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/material">
	<h2 class="font-medium">Free note or link</h2>
	<Field label="Course id" name="courseId" required />
	<Field label="Title" name="title" required />
	<label class="text-sm"
		>Kind
		<select class="rounded border px-2 py-1" name="kind">
			<option>note</option><option>pdf</option><option>video</option><option>link</option>
		</select>
	</label>
	<Field label="https URL" name="externalUrl" />
	<button class="rounded-md border px-3 py-2 text-sm" type="submit">Add material</button>
</form>
