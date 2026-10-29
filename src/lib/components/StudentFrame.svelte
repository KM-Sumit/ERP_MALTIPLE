<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let {
		schoolName,
		userName,
		classLine,
		studentId,
		children
	}: {
		schoolName: string;
		userName: string;
		classLine: string;
		studentId: string;
		children: Snippet;
	} = $props();

	const path = $derived(page.url.pathname);
	const initial = $derived(userName.trim().charAt(0).toUpperCase() || 'S');
	const q = $derived(studentId ? `?student=${studentId}` : '');
	const items = [
		{ href: '/family', label: 'Dashboard', icon: 'home' },
		{ href: '/family/profile', label: 'My Profile', icon: 'user' },
		{ href: '/family/attendance', label: 'Attendance', icon: 'check' },
		{ href: '/family/result', label: 'Exams & Results', icon: 'exam' },
		{ href: '/family/fees', label: 'Fees & Payments', icon: 'fees' },
		{ href: '/family/schedule', label: 'Timetable', icon: 'calendar' },
		{ href: '/family/notes', label: 'Homework & Assignments', icon: 'book' },
		{ href: '/family/course', label: 'Study Material', icon: 'library' },
		{ href: '/family/notice', label: 'Notices & Events', icon: 'calendar' },
		{ href: '/family/complaint', label: 'Messages', icon: 'chat' },
		{ href: '/family/settings', label: 'Settings', icon: 'gear' }
	] as const;

	function current(href: string) {
		if (href === '/family') return path === '/family';
		return path === href || path.startsWith(`${href}/`);
	}
	function go(href: (typeof items)[number]['href']) {
		return `${resolve(href)}${q}`;
	}
</script>

<div class="min-h-screen bg-[#f4f7fb] text-slate-800">
	<aside class="fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col bg-[#0e1628] text-slate-300">
		<a class="flex items-center gap-3 px-4 py-5" href={go('/family')}>
			<span class="grid h-10 w-10 place-items-center rounded-xl bg-[#2f6bff] text-white">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V9l8-5 8 5v11"/><path d="M10 20v-6h4v6"/></svg>
			</span>
			<span>
				<span class="block text-sm font-bold text-white">Student ERP</span>
				<span class="block max-w-[140px] truncate text-[11px] text-slate-400">{schoolName}</span>
			</span>
		</a>
		<nav class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Student">
			{#each items as item (item.label)}
				<a
					class="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] {current(item.href) ? 'bg-[#2f6bff] font-semibold text-white' : 'hover:bg-white/5'}"
					href={go(item.href)}
					aria-current={current(item.href) ? 'page' : undefined}
				>
					<svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8">
						{#if item.icon === 'home'}
							<path d="M4 10.5 12 4l8 6.5V20H4z" />
						{:else if item.icon === 'user'}
							<circle cx="12" cy="8" r="3" /><path d="M6 19c1-3 3.2-4.5 6-4.5s5 1.5 6 4.5" />
						{:else if item.icon === 'check'}
							<circle cx="12" cy="12" r="8" /><path d="m8.5 12.2 2.4 2.4 4.6-5" />
						{:else if item.icon === 'exam'}
							<path d="M7 4h8l3 3v13H7z" /><path d="M9 12h6M9 16h4" />
						{:else if item.icon === 'fees'}
							<path d="M7 7h10M8 7c.4 5 8 3 8 8H8" />
						{:else if item.icon === 'calendar'}
							<rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3.5v3M16 3.5v3M4 10h16" />
						{:else if item.icon === 'book'}
							<path d="M5 5h7a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3z" />
						{:else if item.icon === 'library'}
							<path d="M6 4v16M10 4v16M14 4l4 1.2V19l-4-1.2z" />
						{:else if item.icon === 'chat'}
							<path d="M5 6h14v9H8l-3 3z" />
						{:else}
							<circle cx="12" cy="12" r="3" /><path d="M12 4.5v2M12 17.5v2" />
						{/if}
					</svg>
					{item.label}
				</a>
			{/each}
		</nav>
		<form class="p-3" method="post" action="/logout">
			<button class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] text-slate-300 hover:bg-white/5" type="submit">Logout</button>
		</form>
	</aside>
	<div class="min-h-screen pl-[232px]">
		<header class="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
			<form class="mx-auto hidden max-w-lg flex-1 md:block" action={go('/family/course')}>
				<input class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none" name="q" placeholder="Search..." />
			</form>
			<a class="ml-auto grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100" href={go('/family/notice')} aria-label="Notices">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16h12l-1.2-1.6V10a4.8 4.8 0 0 0-9.6 0v4.4z"/><path d="M10 16a2 2 0 0 0 4 0"/></svg>
			</a>
			<a class="flex items-center gap-2" href={go('/family/profile')}>
				<span class="grid h-9 w-9 place-items-center rounded-full bg-[#2f6bff] text-sm font-bold text-white">{initial}</span>
				<span class="hidden sm:block">
					<span class="block text-sm font-semibold">{userName}</span>
					{#if classLine}<span class="block text-xs text-slate-400">{classLine}</span>{/if}
				</span>
			</a>
		</header>
		<main class="px-6 py-5">
			{@render children()}
		</main>
	</div>
</div>
