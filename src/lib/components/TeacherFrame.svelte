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
	const initial = $derived(userName.trim().charAt(0).toUpperCase() || 'T');
	const todayLabel = new Intl.DateTimeFormat('en-IN', {
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'Asia/Kolkata'
	}).format(new Date());
	const items = [
		{ href: resolve('/teach'), match: '/teach', label: 'Dashboard', icon: 'home' },
		{ href: resolve('/teach/profile'), match: '/teach/profile', label: 'My Profile', icon: 'user' },
		{ href: `${resolve('/teach')}#classes`, match: '/teach#classes', label: 'My Classes', icon: 'classes' },
		{ href: `${resolve('/teach')}#subjects`, match: '/teach#subjects', label: 'My Subjects', icon: 'book' },
		{ href: resolve('/teach/attendance'), match: '/teach/attendance', label: 'Attendance', icon: 'check' },
		{ href: `${resolve('/teach')}#timetable`, match: '/teach#timetable', label: 'Timetable', icon: 'calendar' },
		{ href: resolve('/teach/homework'), match: '/teach/homework', label: 'Homework & Assignments', icon: 'file' },
		{ href: resolve('/teach/marks'), match: '/teach/marks', label: 'Exams & Results', icon: 'chart' },
		{ href: resolve('/teach/homework'), match: '/teach/homework-study', label: 'Study Material', icon: 'folder' },
		{ href: resolve('/teach/marks'), match: '/teach/marks-performance', label: 'Student Performance', icon: 'chart' },
		{ href: `${resolve('/teach')}#notices`, match: '/teach#notices', label: 'Announcements', icon: 'bell' },
		{ href: `${resolve('/teach')}#complaints`, match: '/teach#complaints', label: 'Complaints', icon: 'alert' },
		{ href: `${resolve('/teach')}#notices`, match: '/teach#events', label: 'Notices & Events', icon: 'calendar' },
		{ href: resolve('/teach/profile'), match: '/teach/profile-settings', label: 'Settings', icon: 'gear' }
	];

	function current(match: string) {
		if (match.includes('#') || match.endsWith('-study') || match.endsWith('-settings') || match.endsWith('-performance')) return false;
		if (match === '/teach') return path === '/teach';
		return path === match || path.startsWith(`${match}/`);
	}
</script>

<div class="min-h-screen bg-[#f4f7fb] text-slate-800">
	<aside class="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col bg-[#0e1628] text-slate-300">
		<a class="flex items-center gap-3 px-4 py-5" href={resolve('/teach')}>
			<span class="grid h-10 w-10 place-items-center rounded-xl bg-[#2f6bff] text-white">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V9l8-5 8 5v11"/><path d="M10 20v-6h4v6"/></svg>
			</span>
			<span>
				<span class="block text-sm font-bold text-white">Teacher Portal</span>
				<span class="block max-w-[140px] truncate text-[11px] text-slate-400">{schoolName}</span>
			</span>
		</a>
		<nav class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Teacher">
			{#each items as item (item.label)}
				<a
					class="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] {current(item.match) ? 'bg-[#2f6bff] font-semibold text-white' : 'hover:bg-white/5'}"
					href={item.href}
					aria-current={current(item.match) ? 'page' : undefined}
				>
					<svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8">
						{#if item.icon === 'home'}<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>
						{:else if item.icon === 'user'}<circle cx="12" cy="8" r="3"/><path d="M5 19a7 7 0 0 1 14 0"/>
						{:else if item.icon === 'classes'}<path d="M4 7h16v11H4z"/><path d="M8 7V5h8v2"/>
						{:else if item.icon === 'book'}<path d="M5 5h6a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z"/><path d="M19 5h-5v14h5a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>
						{:else if item.icon === 'check'}<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.4 2.4 4.6-5"/>
						{:else if item.icon === 'calendar'}<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/>
						{:else if item.icon === 'file'}<path d="M7 3.5h7l4 4V20H7z"/><path d="M14 3.5V8h4"/>
						{:else if item.icon === 'chart'}<path d="M5 19V9M10 19V5M15 19v-7M20 19V8"/>
						{:else if item.icon === 'folder'}<path d="M3 7h6l2 2h10v10H3z"/>
						{:else if item.icon === 'bell'}<path d="M6 16h12l-1.2-1.6V10a4.8 4.8 0 0 0-9.6 0v4.4z"/>
						{:else if item.icon === 'alert'}<path d="M12 4 3 19h18z"/><path d="M12 9v5M12 16.5v.5"/>
						{:else}<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2"/>
						{/if}
					</svg>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mx-3 mb-3 rounded-2xl bg-[#1d4ed8] p-3 text-white">
			<p class="text-sm font-semibold">Need Help?</p>
			<a class="text-[11px] text-blue-100" href={resolve('/account')}>Contact admin from your account</a>
		</div>
		<form class="px-3 pb-3" method="post" action="/logout">
			<button class="w-full rounded-xl px-3 py-2 text-left text-[13px] hover:bg-white/5" type="submit">Logout</button>
		</form>
	</aside>
	<div class="min-h-screen pl-[248px]">
		<header class="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
			<form class="mx-auto hidden max-w-lg flex-1 md:block" action="{resolve('/teach')}#classes">
				<input class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm" name="q" placeholder="Search students, classes, subjects..." />
			</form>
			<span class="hidden text-xs text-slate-500 lg:inline">{todayLabel}</span>
			<a class="ml-auto grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100" href="{resolve('/teach')}#notices" aria-label="Notices">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16h12l-1.2-1.6V10a4.8 4.8 0 0 0-9.6 0v4.4z"/></svg>
			</a>
			<a class="flex items-center gap-2" href={resolve('/teach/profile')}>
				<span class="grid h-9 w-9 place-items-center rounded-full bg-[#2f6bff] text-sm font-bold text-white">{initial}</span>
				<span class="hidden text-sm font-semibold sm:inline">{userName}</span>
			</a>
		</header>
		<main class="px-6 py-5">
			{@render children()}
		</main>
	</div>
</div>
