<script lang="ts">
	import Shell from '#lib/components/Shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const tabs = [
		{ href: '/teach', label: 'Home' },
		{ href: '/teach/attendance', label: 'Attendance' },
		{ href: '/teach/marks', label: 'Marks' },
		{ href: '/teach/homework', label: 'Homework' },
		{ href: '/account', label: 'Profile' }
	];
</script>

<Shell title="Teacher" userName={data.fullName} links={data.links} {tabs}>
	{@render children()}
</Shell>
