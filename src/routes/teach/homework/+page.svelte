<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Class work</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.assignments.length === 0}
	<p class="mt-4 text-sm text-stone-600">Assign a class and subject before publishing homework.</p>
{:else}
	<form class="mt-4 grid max-w-lg gap-2" method="post" action="?/homework">
		<label class="text-sm"
			>Section
			<select class="w-full rounded border px-2 py-1" name="sectionId" required>
				{#each data.assignments as assignment (assignment.id)}<option value={assignment.sectionId}
						>{assignment.sectionId}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Subject
			<select class="w-full rounded border px-2 py-1" name="subjectId" required>
				{#each data.assignments as assignment (assignment.id)}<option value={assignment.subjectId}
						>{assignment.subjectId}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Title <input class="w-full rounded border px-2 py-1" name="title" required /></label
		>
		<label class="text-sm"
			>Instructions <textarea class="w-full rounded border px-2 py-1" name="instructions"
			></textarea></label
		>
		<label class="text-sm"
			>Due <input class="rounded border px-2 py-1" type="datetime-local" name="dueAt" /></label
		>
		<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
			>Publish homework</button
		>
	</form>
{/if}
<form class="mt-6 grid max-w-lg gap-2" method="post" action="?/meeting">
	<h2 class="font-medium">Parent meeting</h2>
	<label class="text-sm"
		>Student
		<select class="w-full rounded border px-2 py-1" name="studentId" required>
			{#each data.roster as student (student.id)}<option value={student.id}
					>{student.firstName} {student.lastName}</option
				>{/each}
		</select>
	</label>
	<label class="text-sm"
		>Note <textarea class="w-full rounded border px-2 py-1" name="note" required></textarea></label
	>
	<button class="rounded-md border px-3 py-2 text-sm" type="submit">Request meeting</button>
</form>
<form class="mt-6 grid max-w-lg gap-2" method="post" action="?/leave">
	<h2 class="font-medium">Teacher leave</h2>
	<label class="text-sm"
		>From <input class="rounded border px-2 py-1" type="date" name="startDate" required /></label
	>
	<label class="text-sm"
		>To <input class="rounded border px-2 py-1" type="date" name="endDate" required /></label
	>
	<label class="text-sm"
		>Reason <textarea class="w-full rounded border px-2 py-1" name="reason" required
		></textarea></label
	>
	<button class="rounded-md border px-3 py-2 text-sm" type="submit">Apply</button>
</form>
