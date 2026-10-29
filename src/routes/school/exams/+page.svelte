<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const types = ['unit', 'monthly', 'half_yearly', 'annual', 'practical', 'custom'];
	const adding = $derived(page.url.searchParams.get('add') === '1');
	const selectedId = $derived(page.url.searchParams.get('exam') ?? (!adding ? data.exams[0]?.id : ''));
	const selected = $derived(data.exams.find((exam) => exam.id === selectedId) ?? null);
	const published = $derived(data.cards.filter((card) => card.status === 'published').length);
	const completed = $derived(data.exams.filter((exam) => exam.status === 'completed' || exam.status === 'published').length);

	function when(value: Date | string | null | undefined) {
		if (!value) return '—';
		const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
		if (Number.isNaN(time)) return '—';
		return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(time);
	}
	function href(id: string) {
		return id ? `${resolve('/school/exams')}?exam=${id}` : resolve('/school/exams');
	}
	function tone(status: string) {
		if (status === 'completed' || status === 'published') return 'bg-emerald-50 text-emerald-700';
		if (status === 'cancelled') return 'bg-rose-50 text-rose-700';
		if (status === 'scheduled') return 'bg-amber-50 text-amber-700';
		return 'bg-violet-50 text-violet-700';
	}
</script>

<RecordPage
	crumb="Dashboard  /  Exams & Results"
	title="Exams & Results"
	detail="Create and manage exams, enter marks, and generate results"
	stats={[
		{ label: 'Total Exams', value: String(data.exams.length), note: 'In this school', tone: 'bg-[#eef4ff]' },
		{ label: 'Exams Conducted', value: String(completed), note: data.exams.length ? `${Math.round((completed / data.exams.length) * 100)}% of total` : 'None yet', tone: 'bg-[#e9fbf3]' },
		{ label: 'Results Published', value: String(published), note: 'Report cards', tone: 'bg-[#f3eefe]' },
		{ label: 'Report Cards', value: String(data.cards.length), note: 'Draft and published', tone: 'bg-[#fff8e8]' }
	]}
>
	{#snippet actions()}
		<a class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={`${resolve('/school/exams')}?add=1`}>+ Create Exam</a>
	{/snippet}
	<Alert message={form?.message} />
	{#if form?.saved}<p class="px-3 text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[680px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">#</th><th>Exam Name</th><th>Exam Type</th><th>Start Date</th><th>End Date</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each data.exams as exam, index (exam.id)}
					{@const slots = data.slots.filter((slot) => slot.examId === exam.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3">{index + 1}</td>
						<td><a class="font-semibold" href={href(exam.id)}>{exam.name}</a></td>
						<td>{exam.examType.replaceAll('_', ' ')}</td>
						<td>{when(slots[0]?.startsAt)}</td>
						<td>{when(slots.at(-1)?.endsAt)}</td>
						<td><span class="rounded-full px-2 py-0.5 text-xs font-semibold {tone(exam.status)}">{exam.status}</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="6">No exams yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#snippet side()}
		{#if adding || !selected}
			<h2 class="font-bold">Create Exam</h2>
			<form class="mt-3 grid gap-2 text-sm" method="post" action="?/create">
				<label>Name <input class="mt-1 w-full rounded-lg border px-2 py-1.5" name="name" required /></label>
				<label>Type
					<select class="mt-1 w-full rounded-lg border px-2 py-1.5" name="examType">
						{#each types as type (type)}<option value={type}>{type.replaceAll('_', ' ')}</option>{/each}
					</select>
				</label>
				<label>Session
					<select class="mt-1 w-full rounded-lg border px-2 py-1.5" name="sessionId" required>
						{#each data.sessions as session (session.id)}<option value={session.id}>{session.name}</option>{/each}
					</select>
				</label>
				<label>Duration minutes <input class="mt-1 w-full rounded-lg border px-2 py-1.5" name="durationMinutes" type="number" min="1" /></label>
				<label>Maximum marks <input class="mt-1 w-full rounded-lg border px-2 py-1.5" name="maxMarks" type="number" min="1" /></label>
				<label>Passing marks <input class="mt-1 w-full rounded-lg border px-2 py-1.5" name="passingMarks" type="number" min="0" /></label>
				<label>Instructions <textarea class="mt-1 w-full rounded-lg border px-2 py-1.5" name="instructions"></textarea></label>
				<button class="rounded-lg bg-[#2f6bff] px-3 py-2 font-semibold text-white" type="submit">Create exam</button>
			</form>
		{:else}
			<div class="flex items-start justify-between">
				<div>
					<p class="font-bold">{selected.name}</p>
					<p class="text-xs text-slate-500">{selected.examType} · {selected.status}</p>
				</div>
				<a class="text-slate-400" href={resolve('/school/exams')} aria-label="Close">×</a>
			</div>
			<ul class="mt-3 space-y-1 text-sm">
				{#each data.slots.filter((slot) => slot.examId === selected.id) as slot (slot.id)}
					<li>{when(slot.startsAt)} · {slot.room ?? 'No room'}</li>
				{:else}
					<li class="text-slate-500">No slots yet.</li>
				{/each}
			</ul>
			{#if selected.status === 'draft'}
				<form class="mt-3 grid gap-2 text-sm" method="post" action="?/slot">
					<input type="hidden" name="examId" value={selected.id} />
					<select class="rounded-lg border px-2 py-1.5" name="sectionId" required>
						{#each data.sections as section (section.id)}<option value={section.id}>{section.name}</option>{/each}
					</select>
					<select class="rounded-lg border px-2 py-1.5" name="subjectId" required>
						{#each data.subjects as subject (subject.id)}<option value={subject.id}>{subject.name}</option>{/each}
					</select>
					<input class="rounded-lg border px-2 py-1.5" name="startsAt" type="datetime-local" required />
					<input class="rounded-lg border px-2 py-1.5" name="endsAt" type="datetime-local" required />
					<input class="rounded-lg border px-2 py-1.5" name="room" placeholder="Room" />
					<button class="rounded-lg border px-3 py-2" type="submit">Add slot</button>
				</form>
				<form method="post" action="?/publish">
					<input type="hidden" name="examId" value={selected.id} />
					<button class="mt-2 w-full rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" type="submit">Publish timetable</button>
				</form>
			{/if}
			<form method="post" action="?/approve">
				<input type="hidden" name="examId" value={selected.id} />
				<button class="mt-2 w-full rounded-lg border px-3 py-2 text-sm" type="submit">Approve submitted marks</button>
			</form>
			<form method="post" action="?/cards">
				<input type="hidden" name="examId" value={selected.id} />
				<button class="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" type="submit">Publish report cards</button>
			</form>
			{#each data.cards.filter((card) => card.examId === selected.id) as card (card.id)}
				<p class="mt-2 text-xs">{card.status} · {card.percentage ?? '—'}% · <a class="text-blue-700" href="{resolve('/school/exams/[id]/card', { id: card.examId })}?card={card.id}">PDF</a></p>
			{/each}
		{/if}
	{/snippet}
</RecordPage>
