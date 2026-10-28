<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Marks</h1>
<p class="mt-1 text-sm text-stone-600">
	Leave an absent student blank. Absence is not stored as zero.
</p>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.exams.length === 0 || data.roster.length === 0}
	<p class="mt-4 text-sm text-stone-600">No open exam or assigned student is available.</p>
{:else}
	<form class="mt-4 grid max-w-lg gap-2" method="post" action="?/save">
		<label class="text-sm"
			>Exam
			<select class="w-full rounded border px-2 py-1" name="examId" required>
				{#each data.exams as exam (exam.id)}<option value={exam.id}>{exam.name}</option>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Student
			<select class="w-full rounded border px-2 py-1" name="studentId" required>
				{#each data.roster as student (student.id)}<option value={student.id}
						>{student.firstName} {student.lastName}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Subject
			<select class="w-full rounded border px-2 py-1" name="subjectId" required>
				{#each data.subjects as subject (subject.id)}<option value={subject.id}
						>{subject.name}</option
					>{/each}
			</select>
		</label>
		<label class="text-sm"
			>Outcome
			<select class="w-full rounded border px-2 py-1" name="outcome">
				<option value="scored">scored</option>
				<option value="absent">absent</option>
				<option value="exempt">exempt</option>
				<option value="not_assessed">not assessed</option>
			</select>
		</label>
		<label class="text-sm"
			>Theory <input
				class="w-20 rounded border px-2 py-1"
				name="theoryObtained"
				type="number"
				min="0"
			/>
			/
			<input class="w-20 rounded border px-2 py-1" name="theoryMax" type="number" min="1" /></label
		>
		<label class="text-sm"
			>Practical <input
				class="w-20 rounded border px-2 py-1"
				name="practicalObtained"
				type="number"
				min="0"
			/>
			/
			<input
				class="w-20 rounded border px-2 py-1"
				name="practicalMax"
				type="number"
				min="1"
			/></label
		>
		<label class="text-sm"
			>Internal <input
				class="w-20 rounded border px-2 py-1"
				name="internalObtained"
				type="number"
				min="0"
			/>
			/
			<input
				class="w-20 rounded border px-2 py-1"
				name="internalMax"
				type="number"
				min="1"
			/></label
		>
		<label class="text-sm"
			>Overall, if components are empty
			<input class="w-20 rounded border px-2 py-1" name="marksObtained" type="number" min="0" /> /
			<input class="w-20 rounded border px-2 py-1" name="maxMarks" type="number" min="1" />
		</label>
		<label class="text-sm"
			>Remark <input class="w-full rounded border px-2 py-1" name="remark" /></label
		>
		<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
			>Save draft</button
		>
	</form>
	<form class="mt-4 flex flex-wrap gap-2" method="post" action="?/submit">
		<label class="text-sm"
			>Exam
			<select class="rounded border px-2 py-1" name="examId"
				>{#each data.exams as exam (exam.id)}<option value={exam.id}>{exam.name}</option
					>{/each}</select
			>
		</label>
		<label class="text-sm"
			>Subject
			<select class="rounded border px-2 py-1" name="subjectId"
				>{#each data.subjects as subject (subject.id)}<option value={subject.id}
						>{subject.name}</option
					>{/each}</select
			>
		</label>
		<button class="rounded-md border px-3 py-2 text-sm" type="submit">Submit for review</button>
	</form>
{/if}
