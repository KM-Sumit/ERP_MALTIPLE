<script lang="ts">
	import { resolve } from '$app/paths';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Headset from '@lucide/svelte/icons/headset';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import School from '@lucide/svelte/icons/school';
	import UserRound from '@lucide/svelte/icons/user-round';
	import type { Component } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let index = $state(0);

	const q = $derived(data.selected ? `?student=${data.selected.id}` : '');
	const classLine = $derived(
		data.placement
			? `Class ${data.placement.className} · ${data.placement.sectionName} · ${data.placement.sessionName}`
			: data.schoolName
	);
	const slides = $derived(
		data.notices.length > 0
			? data.notices.map((notice) => ({
					id: notice.id,
					title: notice.title,
					body: notice.body,
					href: `${resolve('/family/notice')}${q}`
				}))
			: [
					{
						id: 'school',
						title: data.schoolName,
						body: classLine,
						href: `${resolve('/family/notice')}${q}`
					}
				]
	);
	const slide = $derived(slides[index] ?? slides[0]);

	const actions: {
		href:
			| '/family/fees'
			| '/family/attendance'
			| '/family/result'
			| '/family/schedule'
			| '/family/teachers'
			| '/family/notice'
			| '/family/course'
			| '/family/notes'
			| '/family/complaint';
		label: string;
		icon: Component;
		tone: string;
	}[] = [
		{ href: '/family/fees', label: 'Fees', icon: IndianRupee, tone: 'bg-[#e8f0ff] text-[#2f6bff]' },
		{ href: '/family/attendance', label: 'Attendance', icon: CircleCheck, tone: 'bg-[#e7f8f1] text-[#059669]' },
		{ href: '/family/result', label: 'Exam & result', icon: GraduationCap, tone: 'bg-[#fff4e5] text-[#d97706]' },
		{ href: '/family/schedule', label: 'Timetable', icon: CalendarDays, tone: 'bg-[#eeeefe] text-[#4f46e5]' },
		{ href: '/family/teachers', label: 'Teacher report', icon: UserRound, tone: 'bg-[#f3e8ff] text-[#7c3aed]' },
		{ href: '/family/notice', label: 'School news', icon: Megaphone, tone: 'bg-[#ffe8ee] text-[#e11d48]' },
		{ href: '/family/course', label: 'Course', icon: BookOpen, tone: 'bg-[#e0f6ff] text-[#0284c7]' },
		{ href: '/family/notes', label: 'Notes', icon: NotebookPen, tone: 'bg-[#ffefe4] text-[#ea580c]' },
		{ href: '/family/complaint', label: 'Support', icon: Headset, tone: 'bg-[#eef2f7] text-[#334155]' }
	];

	function go(href: (typeof actions)[number]['href']) {
		return `${resolve(href)}${q}`;
	}

	function step(delta: number) {
		const count = slides.length;
		index = (index + delta + count) % count;
	}
</script>

<div class="space-y-6">
	<section
		class="relative min-h-[320px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0e1628] via-[#16315c] to-[#2f6bff] text-white shadow-[0_18px_40px_-24px_rgba(15,35,80,0.8)]"
		aria-roledescription="carousel"
		aria-label="School slides"
	>
		<div class="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10"></div>
		<div class="pointer-events-none absolute right-16 bottom-[-40px] h-40 w-40 rounded-full bg-[#7aa6ff]/30"></div>
		<School class="pointer-events-none absolute right-10 bottom-8 h-28 w-28 text-white/15" strokeWidth={1.25} />
		<a class="relative flex min-h-[320px] flex-col justify-end px-8 py-8 pr-24 sm:px-10" href={slide.href}>
			<p class="text-xs font-semibold tracking-[0.18em] text-blue-100 uppercase">School</p>
			<h1 class="mt-3 max-w-2xl text-4xl font-bold tracking-tight">{slide.title}</h1>
			<p class="mt-3 line-clamp-4 max-w-xl text-base leading-relaxed text-slate-200">{slide.body}</p>
		</a>
		{#if slides.length > 1}
			<button
				class="absolute top-1/2 left-4 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-white/15 text-xl backdrop-blur"
				type="button"
				aria-label="Previous slide"
				onclick={() => step(-1)}
			>
				‹
			</button>
			<button
				class="absolute top-1/2 right-4 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-white/15 text-xl backdrop-blur"
				type="button"
				aria-label="Next slide"
				onclick={() => step(1)}
			>
				›
			</button>
			<div class="absolute bottom-5 left-0 flex w-full justify-center gap-2">
				{#each slides as item, dot (item.id)}
					<button
						class="h-2.5 rounded-full {dot === index ? 'w-7 bg-white' : 'w-2.5 bg-white/45'}"
						type="button"
						aria-label="Slide {dot + 1}"
						onclick={() => (index = dot)}
					></button>
				{/each}
			</div>
		{/if}
	</section>

	<nav class="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Student shortcuts">
		{#each actions as action (action.label)}
			{@const Icon = action.icon}
			<a
				class="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_-16px_rgba(15,23,42,0.45)]"
				href={go(action.href)}
			>
				<span class="grid h-16 w-16 place-items-center rounded-2xl shadow-inner {action.tone}">
					<Icon size={28} strokeWidth={1.75} />
				</span>
				<span class="text-sm font-semibold text-slate-800">{action.label}</span>
			</a>
		{/each}
	</nav>
</div>
