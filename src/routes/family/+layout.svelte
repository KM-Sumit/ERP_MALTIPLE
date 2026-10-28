<script lang="ts">
	import Shell from '#lib/components/Shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const tabs = [
		{ href: '/family', label: 'Home' },
		{ href: '/family#messages', label: 'Message' },
		{ href: '/family#notices', label: 'Notice' },
		{ href: '/account', label: 'Profile' }
	];
</script>

<Shell title="Parent" userName={data.fullName} links={data.links} {tabs}>
	{@render children()}
</Shell>
