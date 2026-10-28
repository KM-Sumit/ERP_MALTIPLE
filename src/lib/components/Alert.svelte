<script lang="ts">
	let { message, tone = 'error' }: { message?: string | null; tone?: 'error' | 'success' } =
		$props();
</script>

{#if message}
	<p
		role="alert"
		class="rounded-md px-3 py-2 text-sm {tone === 'error'
			? 'bg-red-50 text-red-800'
			: 'bg-emerald-50 text-emerald-800'}"
	>
		{message}
	</p>
{/if}
