<script lang="ts">
	import QuickGrid from '#lib/components/QuickGrid.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<QuickGrid
	title="Today's work"
	items={[
		{ href: '/teach/attendance', label: 'Attendance' },
		{ href: '/teach/marks', label: 'Marks' },
		{ href: '/teach/homework', label: 'Homework' },
		{ href: '/account', label: 'Profile' }
	]}
/>
<h1 class="mt-4 text-lg font-semibold text-slate-900">Today</h1>
{#if data.today.length === 0}
	<p class="mt-3 text-sm text-stone-600">No published class is scheduled for this weekday.</p>
{:else}
	<ul class="mt-3 text-sm">
		{#each data.today as item (item.timetable_entries.id)}
			<li>Period {item.timetable_entries.periodId.slice(0, 8)} · {item.timetables.name}</li>
		{/each}
	</ul>
{/if}
<section class="mt-6 grid gap-4 md:grid-cols-2">
	<div>
		<h2 class="font-medium">Assigned classes</h2>
		{#if data.assignments.length === 0}
			<p class="text-sm text-stone-600">No class or subject is assigned.</p>
		{:else}
			<ul class="text-sm">
				{#each data.assignments as assignment (assignment.id)}
					<li>
						Section {assignment.sectionId.slice(0, 8)} · subject {assignment.subjectId.slice(0, 8)}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<div>
		<h2 class="font-medium">Exam duties</h2>
		{#if data.duties.length === 0}
			<p class="text-sm text-stone-600">No invigilation is assigned.</p>
		{:else}
			<ul class="text-sm">
				{#each data.duties as duty (duty.id)}<li>
						{duty.startsAt} · {duty.room ?? 'Room not set'}
					</li>{/each}
			</ul>
		{/if}
	</div>
	<div>
		<h2 class="font-medium">Marks awaiting submission</h2>
		<p class="text-sm text-stone-600">{data.pendingMarks.length} draft mark rows.</p>
	</div>
	<div>
		<h2 class="font-medium">Notices</h2>
		{#if data.notices.length === 0}<p class="text-sm text-stone-600">No school notices.</p>{/if}
		<ul class="text-sm">
			{#each data.notices as notice (notice.id)}<li>{notice.title}</li>{/each}
		</ul>
	</div>
	<div>
		<h2 class="font-medium">Complaints</h2>
		{#if data.complaints.length === 0}<p class="text-sm text-stone-600">
				No complaints for your students.
			</p>{/if}
		<ul class="text-sm">
			{#each data.complaints as complaint (complaint.id)}<li>
					{complaint.subject} · {complaint.status}
				</li>{/each}
		</ul>
	</div>
	<div>
		<h2 class="font-medium">Document requests</h2>
		{#if data.documents.length === 0}<p class="text-sm text-stone-600">
				No document requests.
			</p>{/if}
		<ul class="text-sm">
			{#each data.documents as request (request.id)}<li>
					{request.docType} · {request.status}
				</li>{/each}
		</ul>
	</div>
</section>
