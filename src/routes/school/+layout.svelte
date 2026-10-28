<script lang="ts">
	import Shell from '#lib/components/Shell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const tabs = $derived(
		[
			{ href: '/school', label: 'Home' },
			data.links.some((link) => link.href === '/school/notices')
				? { href: '/school/notices', label: 'Notice' }
				: null,
			data.links.some((link) => link.href === '/school/people')
				? { href: '/school/people', label: 'Students' }
				: data.links.some((link) => link.href === '/school/staff')
					? { href: '/school/staff', label: 'Staff' }
					: null,
			data.links.some((link) => link.href === '/school/fees')
				? { href: '/school/fees', label: 'Fees' }
				: null,
			{ href: '/account', label: 'Profile' }
		].filter((tab) => tab !== null)
	);
</script>

<Shell title="School admin" userName={data.fullName} links={data.links} {tabs}>
	{@render children()}
</Shell>
