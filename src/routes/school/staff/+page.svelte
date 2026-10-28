<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Staff</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if form?.invitePath}
	<p role="status" class="mt-2 text-sm">
		Share this activation link. Email delivery is not configured:
		<a
			class="text-teal-800"
			href={resolve('/invite/[token]', { token: form.invitePath.split('/').pop() ?? '' })}
			>{form.invitePath}</a
		>
	</p>
{/if}
{#if data.members.length === 0}
	<p class="mt-4 text-sm text-stone-600">No staff memberships yet.</p>
{:else}
	<ul class="mt-4 grid gap-3">
		{#each data.members as member (member.id)}
			<li class="rounded-md border border-stone-200 bg-white p-3 text-sm">
				<p class="font-medium">{member.full_name}</p>
				<p class="text-stone-500">{member.email} · {member.role_key} · {member.status}</p>
				{#if member.role_key === 'manager_admin'}
					<form class="mt-2 grid gap-1" method="post" action="?/permissions">
						<input type="hidden" name="membershipId" value={member.id} />
						{#each data.permissions as permission (permission)}
							<label class="flex gap-2">
								<input
									type="checkbox"
									name="permission"
									value={permission}
									checked={data.grants.some(
										(grant) =>
											grant.membershipId === member.id && grant.permissionKey === permission
									)}
								/>
								{permission}
							</label>
						{/each}
						<button class="mt-2 w-fit rounded-md bg-teal-800 px-3 py-1 text-white" type="submit">
							Save permissions
						</button>
					</form>
				{/if}
				<form class="mt-2 flex gap-2" method="post" action="?/status">
					<input type="hidden" name="membershipId" value={member.id} />
					<select class="rounded border px-2 py-1" name="status">
						<option value="active">active</option>
						<option value="suspended">suspended</option>
					</select>
					<button class="rounded border px-2 py-1" type="submit">Update membership</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/invite">
	<h2 class="font-medium">Invite</h2>
	<Field label="Name" name="fullName" required />
	<Field label="Email" name="email" type="email" required />
	<label class="grid gap-1 text-sm">
		<span class="font-medium">Role</span>
		<select class="rounded-md border px-3 py-2" name="roleKey">
			<option value="manager_admin">Manager Admin</option>
			<option value="teacher">Teacher</option>
			<option value="school_admin">School Admin</option>
		</select>
	</label>
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit"
		>Create invitation</button
	>
</form>
