<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let {
		schoolName,
		userName,
		children
	}: {
		schoolName: string;
		userName: string;
		children: Snippet;
	} = $props();

	const path = $derived(page.url.pathname);
	const initial = $derived(userName.trim().charAt(0).toUpperCase() || 'A');
	const items = [
		{ href: resolve('/school'), match: '/school', label: 'Dashboard', icon: 'home' },
		{ href: resolve('/school/academic'), match: '/school/academic', label: 'Academics', icon: 'cap' },
		{ href: resolve('/school/people'), match: '/school/people', label: 'Students', icon: 'students' },
		{ href: resolve('/school/staff'), match: '/school/staff', label: 'Teachers', icon: 'teacher' },
		{ href: resolve('/school/classes'), match: '/school/classes', label: 'Classes & Sections', icon: 'classes' },
		{ href: resolve('/school/attendance'), match: '/school/attendance', label: 'Attendance', icon: 'check' },
		{ href: resolve('/school/exams'), match: '/school/exams', label: 'Exams & Results', icon: 'exam' },
		{ href: resolve('/school/fees'), match: '/school/fees', label: 'Fees & Payments', icon: 'fees' },
		{ href: resolve('/school/timetable'), match: '/school/timetable', label: 'Timetable', icon: 'calendar' },
		{ href: resolve('/school/courses'), match: '/school/courses', label: 'Homework & Assignments', icon: 'book' },
		{ href: resolve('/school/documents'), match: '/school/documents', label: 'Library', icon: 'library' },
		{ href: resolve('/school/complaints'), match: '/school/complaints', label: 'Transport', icon: 'bus' },
		{ href: resolve('/school/notices'), match: '/school/notices-chat', label: 'Communication', icon: 'chat' },
		{ href: resolve('/school/notices'), match: '/school/notices', label: 'Events & Notices', icon: 'calendar' },
		{ href: resolve('/school/reports'), match: '/school/reports', label: 'Reports', icon: 'chart' },
		{ href: resolve('/school/profile'), match: '/school/profile', label: 'Settings', icon: 'gear' }
	];

	const searchAction = $derived(
		path.startsWith('/school/staff')
			? resolve('/school/staff')
			: path.startsWith('/school/classes')
				? resolve('/school/classes')
				: path.startsWith('/school/fees')
					? resolve('/school/fees')
					: path.startsWith('/school/attendance')
						? resolve('/school/attendance')
						: resolve('/school/people')
	);
	const searchHint = $derived(
		path.startsWith('/school/staff')
			? 'Search by teacher name or email...'
			: path.startsWith('/school/classes')
				? 'Search class, section...'
				: path.startsWith('/school/fees')
					? 'Search by student name, admission no...'
					: 'Search by name, admission no., class, section...'
	);

	function current(match: string) {
		if (match === '/school' || match.startsWith('/school#')) return path === '/school';
		if (match === '/school/notices-chat') return false;
		return path === match || path.startsWith(`${match}/`);
	}
</script>

<div class="min-h-screen bg-[#f4f7fb] text-slate-800">
	<aside class="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#0e1628] text-slate-300">
		<a class="flex items-center gap-3 px-5 py-5" href={resolve('/school')}>
			<span class="grid h-10 w-10 place-items-center rounded-xl bg-[#2f6bff] text-white">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V9l8-5 8 5v11"/><path d="M10 20v-6h4v6"/></svg>
			</span>
			<span>
				<span class="block text-sm font-bold tracking-wide text-white">SCHOOL ERP</span>
				<span class="block max-w-[150px] truncate text-[11px] text-slate-400">{schoolName}</span>
			</span>
		</a>
		<nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-6" aria-label="Admin">
			{#each items as item (item.label)}
				<a
					class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] {current(item.match)
						? 'bg-[#2f6bff] font-semibold text-white'
						: 'hover:bg-white/5'}"
					href={item.href}
					aria-current={current(item.match) ? 'page' : undefined}
				>
					<span class="grid h-5 w-5 place-items-center opacity-90">
						{#if item.icon === 'home'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-6h4v6"/></svg>
						{:else if item.icon === 'cap'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-4 9 4-9 4z"/><path d="M7 11.5V16c1.6 1 3.3 1.5 5 1.5s3.4-.5 5-1.5v-4.5"/></svg>
						{:else if item.icon === 'students'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="2.2"/><circle cx="16" cy="9" r="1.7"/><path d="M4.5 18v-1a3 3 0 0 1 3-3H11a3 3 0 0 1 3 3v1"/><path d="M14 18v-.6a2.4 2.4 0 0 1 2-2.3h1.4A2.4 2.4 0 0 1 20 17.4V18"/></svg>
						{:else if item.icon === 'teacher'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="2.4"/><path d="M7 19v-1.2A3.8 3.8 0 0 1 10.8 14h2.4A3.8 3.8 0 0 1 17 17.8V19"/></svg>
						{:else if item.icon === 'classes'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>
						{:else if item.icon === 'check'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>
						{:else if item.icon === 'exam'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3.5h8l3 3V20H7z"/><path d="M15 3.5V7h3"/><path d="M9 12h6M9 16h4"/></svg>
						{:else if item.icon === 'fees'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h10M8 7c.4 5 8 3 8 8H8"/><path d="M8 19 16 14"/></svg>
						{:else if item.icon === 'calendar'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/></svg>
						{:else if item.icon === 'book'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5.5h6.5a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3z"/><path d="M19 5.5h-6.5"/></svg>
						{:else if item.icon === 'library'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4v16M10 4v16M14 4l4 1.2V19l-4-1.2z"/></svg>
						{:else if item.icon === 'bus'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M4 12h16M7 19v-3M17 19v-3"/></svg>
						{:else if item.icon === 'chat'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 6h14v9H8l-3 3z"/></svg>
						{:else if item.icon === 'chart'}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5M4 19h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>
						{:else}
							<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2"/></svg>
						{/if}
					</span>
					<span class="flex-1">{item.label}</span>
					{#if item.label === 'Academics'}
						<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>
					{/if}
				</a>
			{/each}
		</nav>
	</aside>
	<div class="min-h-screen pl-[248px]">
		<header class="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
			<div class="min-w-0">
				<p class="truncate text-sm font-bold text-slate-900">{schoolName}</p>
				<p class="text-xs text-slate-500">Admin Dashboard</p>
			</div>
			<form class="relative mx-auto hidden max-w-xl flex-1 md:block" action={searchAction}>
				<svg viewBox="0 0 24 24" class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
				<input
					class="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm outline-none focus:border-blue-500"
					name="q"
					placeholder={searchHint}
				/>
			</form>
			<a class="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100" href={resolve('/school/notices')} aria-label="Notices">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16h12l-1.2-1.6V10a4.8 4.8 0 0 0-9.6 0v4.4z"/><path d="M10 16a2 2 0 0 0 4 0"/></svg>
			</a>
			<a class="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-slate-100" href={resolve('/account')}>
				<span class="grid h-9 w-9 place-items-center rounded-full bg-[#2f6bff] text-sm font-bold text-white">{initial}</span>
				<span class="hidden text-sm font-semibold text-slate-800 sm:inline">{userName.split(' ')[0] || 'Admin'}</span>
			</a>
		</header>
		<main class="px-6 py-5">
			{@render children()}
		</main>
	</div>
</div>
