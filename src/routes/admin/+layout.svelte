<script lang="ts">
	import Shell from '#lib/components/Shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const links = [
		{ href: '/admin', label: 'Home' },
		{ href: '/account', label: 'Profile' }
	];
</script>

<Shell title="Super Admin" userName={data.fullName} {links} tabs={links}>
	{@render children()}
</Shell>
