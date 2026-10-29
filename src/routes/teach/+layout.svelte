<script lang="ts">
	import TeacherFrame from '#lib/components/TeacherFrame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<TeacherFrame schoolName={data.schoolName} userName={data.fullName}>
	{@render children()}
</TeacherFrame>
