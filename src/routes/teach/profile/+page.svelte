<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-2xl font-bold">My Profile</h1>
<p class="text-sm text-slate-500">Your classes and account</p>
<section class="mt-4 grid gap-4 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-2">
	<div>
		<p class="text-xs text-slate-400">Name</p>
		<p class="text-xl font-bold">{data.fullName}</p>
		<a class="mt-4 inline-block rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={resolve('/account')}>Account settings</a>
	</div>
	<div>
		<p class="text-xs text-slate-400">Assigned classes</p>
		<ul class="mt-2 space-y-2 text-sm">
			{#each data.classes as room (room.sectionId)}
				<li>Class {room.className} · {room.sectionName} · {room.subjects} · {room.students} students</li>
			{:else}
				<li class="text-slate-500">No class is assigned yet.</li>
			{/each}
		</ul>
	</div>
</section>
