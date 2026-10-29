<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		crumb,
		title,
		detail,
		actions,
		stats = [],
		tabs = [],
		children,
		side
	}: {
		crumb: string;
		title: string;
		detail: string;
		actions?: Snippet;
		stats?: { label: string; value: string; note: string; tone: string }[];
		tabs?: { href: string; label: string; active: boolean }[];
		children: Snippet;
		side?: Snippet;
	} = $props();
</script>

<div>
	<p class="text-xs text-slate-400">{crumb}</p>
	<div class="mt-1 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">{title}</h1>
			<p class="text-sm text-slate-500">{detail}</p>
		</div>
		{#if actions}
			<div class="flex flex-wrap gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
	{#if stats.length}
		<section class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each stats as stat (stat.label)}
				<article class="rounded-2xl p-4 {stat.tone}">
					<p class="text-xs text-slate-500">{stat.label}</p>
					<p class="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
					<p class="mt-1 text-xs font-semibold text-emerald-600">{stat.note}</p>
				</article>
			{/each}
		</section>
	{/if}
	{#if tabs.length}
		<nav class="mt-4 flex gap-5 border-b border-slate-200 text-sm">
			{#each tabs as tab (tab.label)}
				<a
					class="pb-2 {tab.active ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-slate-500'}"
					href={tab.href}
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	{/if}
	<div class="mt-4 grid items-start gap-4 {side ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}">
		<div class="min-w-0 rounded-2xl bg-white shadow-sm">
			{@render children()}
		</div>
		{#if side}
			<aside class="rounded-2xl bg-white p-4 shadow-sm">
				{@render side()}
			</aside>
		{/if}
	</div>
</div>
