<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Attendance</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.roster.length === 0}
	<p class="mt-4 text-sm text-stone-600">No students are enrolled in your assigned sections.</p>
{:else}
	<form class="mt-4 grid max-w-md gap-3" method="post" action="?/save">
		<label class="text-sm"
			>Date <input
				class="w-full rounded border px-2 py-1"
				type="date"
				name="date"
				value={data.date}
				required
			/></label
		>
		<label class="text-sm"
			>Student
			<select class="w-full rounded border px-2 py-1" name="studentId" required>
				{#each data.roster as student (student.id)}<option value={student.id}
						>{student.firstName} {student.lastName}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Section
			<select class="w-full rounded border px-2 py-1" name="sectionId" required>
				{#each data.assignments as assignment (assignment.id)}<option
						value={assignment.sectionId}
						selected={assignment.sectionId === data.sectionId}
						>{assignment.sectionId.slice(0, 8)}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Status
			<select class="w-full rounded border px-2 py-1" name="status">
				<option value="present">present</option>
				<option value="absent">absent</option>
				<option value="late">late</option>
				<option value="excused">excused</option>
			</select>
		</label>
		<div class="flex gap-2">
			<button class="rounded-md border px-3 py-2 text-sm" name="submit" value="no" type="submit"
				>Save draft</button
			>
			<button
				class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white"
				name="submit"
				value="yes"
				type="submit">Submit</button
			>
		</div>
	</form>
{/if}
<h2 class="mt-6 font-medium">Recent records</h2>
{#if data.history.length === 0}
	<p class="text-sm text-stone-600">Nothing has been recorded for this section.</p>
{:else}
	<ul class="text-sm">
		{#each data.history as row (row.id)}
			<li class="mt-2">
				{row.attendanceDate} · {row.status} · {row.workflow}
				{#if row.workflow === 'submitted'}
					<form method="post" action="?/correct" class="mt-1 flex gap-2">
						<input type="hidden" name="attendanceId" value={row.id} />
						<label class="sr-only" for="note-{row.id}">Correction note</label>
						<input id="note-{row.id}" class="rounded border px-2 py-1" name="note" required />
						<button class="text-sm underline" type="submit">Request correction</button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
