<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		title,
		items
	}: {
		title: string;
		items: { href: string; label: string }[];
	} = $props();
</script>

{#if items.length > 0}
	<section class="rounded-2xl bg-white p-4 shadow-sm">
		<h2 class="text-lg font-semibold text-slate-900">{title}</h2>
		<div class="mt-3 grid grid-cols-3 gap-2">
			{#each items as item (item.href)}
				<a
					class="grid justify-items-center gap-2 rounded-2xl px-1 py-3 text-center text-xs leading-tight text-slate-700 hover:bg-emerald-50"
					href={resolve(item.href as '/')}
				>
					<span
						class="grid h-12 w-12 place-items-center rounded-full border border-emerald-200 text-emerald-700"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
						>
							<circle cx="12" cy="12" r="7" />
							<path d="M12 8v4l2.5 1.5" stroke-linecap="round" />
						</svg>
					</span>
					{item.label}
				</a>
			{/each}
		</div>
	</section>
{/if}
