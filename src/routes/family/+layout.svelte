<script lang="ts">
	import StudentFrame from '#lib/components/StudentFrame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<StudentFrame
	schoolName={data.schoolName}
	userName={data.studentName}
	classLine={data.classLine}
	studentId={data.studentId}
>
	{@render children()}
</StudentFrame>
