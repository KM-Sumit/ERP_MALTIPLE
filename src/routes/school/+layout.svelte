<script lang="ts">
	import AdminFrame from '#lib/components/AdminFrame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AdminFrame schoolName={data.schoolName} userName={data.fullName}>
	{@render children()}
</AdminFrame>
