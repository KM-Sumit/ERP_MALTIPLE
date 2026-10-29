<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let {
		title,
		userName,
		links,
		tabs = links,
		mark = 'ERP',
		children
	}: {
		title: string;
		userName: string;
		links: { href: string; label: string }[];
		tabs?: { href: string; label: string }[];
		mark?: string;
		children: Snippet;
	} = $props();

	const path = $derived(page.url.pathname);
	const hash = $derived(page.url.hash);
	const initial = $derived(userName.trim().charAt(0).toUpperCase() || 'S');
	const hello = $derived.by(() => {
		const ist = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
		const hour = ist.getUTCHours();
		if (hour < 12) return 'Good Morning';
		if (hour < 17) return 'Good Afternoon';
		return 'Good Evening';
	});

	function open(href: string) {
		const [pathname, fragment] = href.split('#');
		if (fragment) return path === pathname && hash === `#${fragment}`;
		if (
			pathname === '/admin' ||
			pathname === '/school' ||
			pathname === '/family' ||
			pathname === '/teach'
		) {
			return path === pathname && hash === '';
		}
		return path === pathname || path.startsWith(`${pathname}/`);
	}
</script>

<div class="min-h-screen bg-[#e8edf1]">
	<div class="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-[#f6f8f7] shadow-xl">
		<header class="flex items-center gap-3 px-4 pt-5 pb-2">
			<div
				class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800"
			>
				{initial}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-sm text-slate-500">{hello}</p>
				<p class="truncate text-[1.05rem] font-bold tracking-wide text-slate-900 uppercase">
					{userName}
				</p>
			</div>
			<div
				class="grid max-w-28 min-h-12 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-white px-2 py-1 text-center text-[10px] leading-tight font-bold break-words text-emerald-700"
			>
				{mark}
			</div>
		</header>
		<p
			class="px-4 pb-2 text-center text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
		>
			{title}
		</p>
		<main class="flex-1 overflow-x-hidden px-4 pt-2 pb-24">
			{@render children()}
		</main>
		<nav
			class="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[440px] -translate-x-1/2 justify-around border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
			aria-label="Primary"
		>
			{#each tabs as tab (tab.href)}
				<a
					class="grid min-w-0 flex-1 justify-items-center gap-0.5 px-1 py-1 text-[11px] {open(
						tab.href
					)
						? 'font-semibold text-emerald-700'
						: 'text-slate-500'}"
					href={tab.href.includes('#') ? tab.href : resolve(tab.href as '/')}
					aria-current={open(tab.href) ? 'page' : undefined}
				>
					<span
						class="h-0.5 w-6 rounded-full {open(tab.href) ? 'bg-emerald-600' : 'bg-transparent'}"
					></span>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>
</div>
