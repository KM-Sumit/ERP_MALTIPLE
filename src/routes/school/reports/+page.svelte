<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="text-2xl font-semibold">Reports</h1>
<p class="mt-2 text-sm text-stone-600">
	The export is generated from this school's current student records.
</p>
<p class="mt-4">
	<a class="rounded-md bg-teal-800 px-4 py-2 text-white" href={resolve('/school/reports/export')}
		>Download roster</a
	>
</p>
