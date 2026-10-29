<script lang="ts">
	import { resolve } from '$app/paths';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';

	const cards = [
		{ title: 'Student roster', detail: 'Download the current student list.', href: resolve('/school/reports/export'), action: 'Download' },
		{ title: 'Attendance', detail: 'Open the attendance register.', href: resolve('/school/attendance'), action: 'Open' },
		{ title: 'Fee collection', detail: 'Open fees and pending invoices.', href: resolve('/school/fees'), action: 'Open' },
		{ title: 'Exams and results', detail: 'Open exam status and report cards.', href: resolve('/school/exams'), action: 'Open' },
		{ title: 'Classes', detail: 'Open classes and sections.', href: resolve('/school/classes'), action: 'Open' },
		{ title: 'Teachers', detail: 'Open the teacher list.', href: resolve('/school/staff'), action: 'Open' }
	];
</script>

<RecordPage crumb="Dashboard  /  Reports" title="Reports" detail="Generate and download school reports">
	<div class="grid gap-3 p-4 sm:grid-cols-2">
		{#each cards as card (card.title)}
			<article class="rounded-2xl border border-slate-100 p-4">
				<h2 class="font-semibold">{card.title}</h2>
				<p class="mt-1 text-sm text-slate-500">{card.detail}</p>
				<a class="mt-3 inline-block rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700" href={card.href}>{card.action}</a>
			</article>
		{/each}
	</div>
</RecordPage>
