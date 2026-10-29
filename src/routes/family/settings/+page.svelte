<script lang="ts">
	import { resolve } from '$app/paths';
	import PanelPage from '#lib/components/PanelPage.svelte';
</script>

<PanelPage title="Settings" detail="Manage your account">
	<section class="rounded-2xl bg-white p-5 shadow-sm">
		<h2 class="font-semibold">Profile settings</h2>
		<p class="mt-1 text-sm text-slate-500">Password and account details are on your account page.</p>
		<a class="mt-3 inline-block rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href={resolve('/account')}>Open account</a>
	</section>
</PanelPage>
