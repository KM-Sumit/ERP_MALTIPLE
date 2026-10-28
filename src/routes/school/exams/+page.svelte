<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const types = ['unit', 'monthly', 'half_yearly', 'annual', 'practical', 'custom'];
</script>

<h1 class="text-2xl font-semibold">Examinations</h1>
<p class="mt-1 text-sm text-stone-600">
	Build a draft timetable, publish it, then approve and publish results.
</p>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-3 text-sm text-emerald-800">{form.saved}</p>{/if}

<form class="mt-4 grid gap-2 md:grid-cols-2" method="post" action="?/create">
	<label class="text-sm"
		>Name <input class="w-full rounded border px-2 py-1" name="name" required /></label
	>
	<label class="text-sm"
		>Type
		<select class="w-full rounded border px-2 py-1" name="examType">
			{#each types as type (type)}<option value={type}>{type}</option>{/each}
		</select>
	</label>
	<label class="text-sm"
		>Session
		<select class="w-full rounded border px-2 py-1" name="sessionId" required>
			{#each data.sessions as session (session.id)}<option value={session.id}>{session.name}</option
				>{/each}
		</select>
	</label>
	<label class="text-sm"
		>Duration minutes <input
			class="w-full rounded border px-2 py-1"
			name="durationMinutes"
			type="number"
			min="1"
		/></label
	>
	<label class="text-sm"
		>Maximum marks <input
			class="w-full rounded border px-2 py-1"
			name="maxMarks"
			type="number"
			min="1"
		/></label
	>
	<label class="text-sm"
		>Passing marks <input
			class="w-full rounded border px-2 py-1"
			name="passingMarks"
			type="number"
			min="0"
		/></label
	>
	<label class="text-sm md:col-span-2"
		>Instructions <textarea class="w-full rounded border px-2 py-1" name="instructions"
		></textarea></label
	>
	<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
		>Create exam</button
	>
</form>

{#if data.exams.length === 0}
	<p class="mt-6 text-sm text-stone-600">No exams yet.</p>
{:else}
	<ul class="mt-6 space-y-4">
		{#each data.exams as exam (exam.id)}
			<li class="rounded-md border border-stone-200 p-3">
				<h2 class="font-medium">{exam.name}</h2>
				<p class="text-sm text-stone-600">{exam.examType} · {exam.status}</p>
				<ul class="mt-2 text-sm">
					{#each data.slots.filter((slot) => slot.examId === exam.id) as slot (slot.id)}
						<li>{slot.startsAt} – {slot.endsAt} · {slot.room ?? 'No room'}</li>
					{:else}
						<li>No slots yet.</li>
					{/each}
				</ul>
				{#if exam.status === 'draft'}
					<form class="mt-3 grid gap-2 md:grid-cols-2" method="post" action="?/slot">
						<input type="hidden" name="examId" value={exam.id} />
						<label class="text-sm"
							>Section
							<select class="w-full rounded border px-2 py-1" name="sectionId" required>
								{#each data.sections as section (section.id)}<option value={section.id}
										>{section.name}</option
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
							>Starts <input
								class="w-full rounded border px-2 py-1"
								name="startsAt"
								type="datetime-local"
								required
							/></label
						>
						<label class="text-sm"
							>Ends <input
								class="w-full rounded border px-2 py-1"
								name="endsAt"
								type="datetime-local"
								required
							/></label
						>
						<label class="text-sm"
							>Room <input class="w-full rounded border px-2 py-1" name="room" /></label
						>
						<label class="text-sm"
							>Seating plan <input
								class="w-full rounded border px-2 py-1"
								name="seatingPlan"
							/></label
						>
						<button class="rounded-md border px-3 py-2 text-sm" type="submit">Add slot</button>
					</form>
					<form class="mt-2" method="post" action="?/publish">
						<input type="hidden" name="examId" value={exam.id} />
						<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
							>Publish timetable</button
						>
					</form>
				{/if}
				<form class="mt-2 flex flex-wrap gap-2" method="post" action="?/approve">
					<input type="hidden" name="examId" value={exam.id} />
					<button class="rounded-md border px-3 py-2 text-sm" type="submit"
						>Approve submitted marks</button
					>
				</form>
				<form method="post" action="?/cards">
					<input type="hidden" name="examId" value={exam.id} />
					<button class="rounded-md bg-teal-800 px-3 py-2 text-sm text-white" type="submit"
						>Publish report cards</button
					>
				</form>
				<form class="mt-2 flex gap-2" method="post" action="?/cancel">
					<input type="hidden" name="examId" value={exam.id} />
					<label class="text-sm"
						>Type cancel <input class="rounded border px-2 py-1" name="confirm" /></label
					>
					<button
						class="rounded-md border border-red-300 px-3 py-2 text-sm text-red-800"
						type="submit">Cancel exam</button
					>
				</form>
			</li>
		{/each}
	</ul>
	<h2 class="mt-6 font-medium">Report cards</h2>
	{#if data.cards.length === 0}
		<p class="text-sm text-stone-600">Approved cards appear after marks are submitted.</p>
	{:else}
		<ul class="text-sm">
			{#each data.cards as card (card.id)}
				<li>
					{card.status} · {card.percentage ?? 'no percentage'} · {card.grade ?? '-'}
					<a href="{resolve('/school/exams/[id]/card', { id: card.examId })}?card={card.id}">PDF</a>
					<form method="post" action="?/reopen" class="inline">
						<input type="hidden" name="cardId" value={card.id} />
						<input class="rounded border px-2 py-1" name="remarks" placeholder="Correction note" />
						<button class="text-sm underline" type="submit">Reopen</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
