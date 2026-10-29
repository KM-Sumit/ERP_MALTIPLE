<script lang="ts">
	let { label, href }: { label: string; href: string } = $props();

	const kind = $derived.by(() => {
		const text = `${label} ${href}`.toLowerCase();
		if (text.includes('attendance')) return 'attendance';
		if (text.includes('timetable') || text.includes('schedule')) return 'timetable';
		if (text.includes('homework')) return 'homework';
		if (text.includes('exam')) return 'exams';
		if (text.includes('course')) return 'courses';
		if (text.includes('staff')) return 'staff';
		if (text.includes('student') || text.includes('/people')) return 'students';
		if (text.includes('notice')) return 'notices';
		if (text.includes('fee')) return 'fees';
		if (text.includes('complaint')) return 'complaints';
		if (text.includes('bonafide') || text.includes('document')) return 'documents';
		if (text.includes('report')) return 'reports';
		if (text.includes('result') || text.includes('mark')) return 'results';
		if (text.includes('note') || text.includes('material')) return 'notes';
		if (text.includes('audit')) return 'audit';
		if (text.includes('operation') || text.includes('setting')) return 'operations';
		if (text.includes('school')) return 'schools';
		if (text.includes('profile') || text.includes('account')) return 'profile';
		if (text.includes('academic')) return 'academic';
		return 'academic';
	});
</script>

<svg
	viewBox="0 0 24 24"
	class="h-6 w-6"
	fill="none"
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if kind === 'timetable'}
		<rect x="4" y="5" width="16" height="15" rx="2" />
		<path d="M8 3.5v3M16 3.5v3M4 9.5h16" />
		<path d="M12 12.5v2.2l1.6 1" />
	{:else if kind === 'exams'}
		<rect x="6" y="3.5" width="12" height="17" rx="2" />
		<path d="M9 3.5h6V6H9z" />
		<path d="M9 11h6M9 14.5h4" />
	{:else if kind === 'courses'}
		<path d="M3.5 7c2.2-1.2 4.4-1.2 6.5.2v11c-2.1-1.2-4.3-1.2-6.5 0z" />
		<path d="M20.5 7c-2.2-1.2-4.4-1.2-6.5.2v11c2.1-1.2 4.3-1.2 6.5 0z" />
		<path d="M12 7.2v11" />
	{:else if kind === 'staff'}
		<rect x="5" y="3.5" width="14" height="17" rx="2" />
		<circle cx="12" cy="9.5" r="2.2" />
		<path d="M8.5 16.5c.7-1.4 1.9-2 3.5-2s2.8.6 3.5 2" />
	{:else if kind === 'students'}
		<circle cx="9" cy="8.5" r="2.2" />
		<circle cx="16" cy="9.2" r="1.7" />
		<path d="M4.5 18.5v-1.1A2.8 2.8 0 0 1 7.3 14.6H11a2.8 2.8 0 0 1 2.8 2.6" />
		<path d="M13.5 18.5v-.7a2.3 2.3 0 0 1 2-2.2h1.6a2.3 2.3 0 0 1 2.3 2.2v.7" />
	{:else if kind === 'notices'}
		<path d="M6 16.5h12l-1.3-1.8V10a4.7 4.7 0 0 0-9.4 0v4.7z" />
		<path d="M10 16.5a2 2 0 0 0 4 0" />
	{:else if kind === 'fees'}
		<path d="M7 6h10" />
		<path d="M7 10h10" />
		<path d="M8 6c.2 5.2 8 3.4 8 8.2H8" />
		<path d="M8 19.2 16.2 14" />
	{:else if kind === 'complaints'}
		<path d="M5 6.5h14v8.5H9.5L5 18.5z" />
		<path d="M8.5 10.5h7M8.5 13h4" />
	{:else if kind === 'documents'}
		<path d="M7 3.5h7l4 4V20.5H7z" />
		<path d="M14 3.5v4h4" />
		<path d="M9.5 12.5h5M9.5 16h3.5" />
	{:else if kind === 'reports'}
		<path d="M5 19V5" />
		<path d="M5 19h14" />
		<path d="M9 16v-4M13 16V8M17 16v-6" />
	{:else if kind === 'profile'}
		<circle cx="12" cy="8" r="3" />
		<path d="M6 19.5v-1.2A4 4 0 0 1 10 14.3h4a4 4 0 0 1 4 4v1.2" />
	{:else if kind === 'attendance'}
		<circle cx="12" cy="12" r="8" />
		<path d="M8.2 12.3 11 15l4.8-5.2" />
	{:else if kind === 'homework'}
		<path d="M14 4.5 19.5 10 10 19.5H4.5V14z" />
		<path d="M12.2 6.3 17.7 11.8" />
	{:else if kind === 'results'}
		<circle cx="12" cy="9" r="3.5" />
		<path d="M8.8 12.8 7.5 20l4.5-2.2L16.5 20l-1.3-7.2" />
	{:else if kind === 'notes'}
		<path d="M7 4h8l3 3v13H7z" />
		<path d="M15 4v3h3" />
		<path d="M9.5 11.5h5.5M9.5 14.5h4M9.5 17.5h3" />
	{:else if kind === 'audit'}
		<circle cx="10.5" cy="10.5" r="5" />
		<path d="M14.2 14.2 19 19" />
		<path d="M8.5 10.5h4" />
	{:else if kind === 'operations'}
		<circle cx="12" cy="12" r="3" />
		<path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2" />
		<path d="m6.4 6.4 1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4" />
	{:else if kind === 'schools'}
		<path d="M4 20V9.5L12 5l8 4.5V20" />
		<path d="M10 20v-5h4v5" />
		<path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
	{:else}
		<path d="M3 10 12 5.5 21 10 12 14.5z" />
		<path d="M7 12.2V16c1.6 1.3 3.2 2 5 2s3.4-.7 5-2v-3.8" />
		<path d="M21 10v6" />
	{/if}
</svg>
