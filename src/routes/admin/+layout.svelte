<script lang="ts">
	import Shell from '#lib/components/Shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const links = [
		{ href: '/admin', label: 'Home' },
		{ href: '/admin/schools', label: 'Schools' },
		{ href: '/admin/audit', label: 'Audit' },
		{ href: '/admin/settings', label: 'Operations' },
		{ href: '/account', label: 'Profile' }
	];
</script>

<Shell title="Super Admin" userName={data.fullName} {links} tabs={links}>
	{@render children()}
</Shell>
