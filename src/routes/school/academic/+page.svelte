<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Academics</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
<div class="mt-4 grid gap-4 md:grid-cols-2">
	<section>
		<h2 class="font-medium">Sessions</h2>
		{#if data.sessions.length === 0}<p class="text-sm text-stone-600">None yet.</p>{/if}
		<ul>
			{#each data.sessions as session (session.id)}<li>{session.name} · {session.status}</li>{/each}
		</ul>
	</section>
	<section>
		<h2 class="font-medium">Classes and sections</h2>
		{#if data.classes.length === 0}<p class="text-sm text-stone-600">None yet.</p>{/if}
		<ul>
			{#each data.classes as item (item.id)}
				<li>
					{item.name}
					{#each data.sections.filter((section) => section.classId === item.id) as section (section.id)}
						<span class="text-stone-500"> {section.name}</span>
					{/each}
				</li>
			{/each}
		</ul>
	</section>
</div>
<p class="mt-3 text-sm">
	Subjects: {data.subjects.map((subject) => subject.name).join(', ') || 'None yet.'}
</p>
<form class="mt-4 grid gap-3 md:grid-cols-2" method="post">
	<Field label="New session name" name="sessionName" />
	<Field label="Start" name="startDate" type="date" />
	<Field label="End" name="endDate" type="date" />
	<Field label="Class name" name="className" />
	<Field label="Grade" name="gradeLevel" type="number" min="0" max="20" />
	<Field label="Section" name="sectionName" />
	<Field label="Subject" name="subjectName" />
	<Field label="Subject code" name="subjectCode" />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white md:col-span-2" type="submit"
		>Add</button
	>
</form>
