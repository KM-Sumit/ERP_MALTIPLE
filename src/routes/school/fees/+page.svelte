<script lang="ts">
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">Fees</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
<p class="mt-2 text-sm text-stone-600">
	Collected {data.collectedPaise} paise · {data.pendingPayments} pending gateway payments
</p>

<form class="mt-4 grid max-w-xl gap-3" method="post" action="?/plan">
	<h2 class="font-medium">Fee plan</h2>
	<label class="text-sm"
		>Session
		<select class="w-full rounded border px-2 py-1" name="sessionId" required>
			{#each data.sessions as session (session.id)}
				<option value={session.id}>{session.name}</option>
			{/each}
		</select>
	</label>
	<Field label="Name" name="name" required />
	<Field label="Amount in paise" name="amountPaise" type="number" required />
	<label class="text-sm"
		>Category
		<select class="w-full rounded border px-2 py-1" name="category">
			<option>tuition</option><option>admission</option><option>transport</option>
			<option>examination</option><option>other</option>
		</select>
	</label>
	<label class="text-sm"
		>Schedule
		<select class="w-full rounded border px-2 py-1" name="schedule">
			<option>monthly</option><option>quarterly</option><option>half_yearly</option><option
				>annual</option
			>
		</select>
	</label>
	<label class="text-sm"
		>Late fee
		<select class="w-full rounded border px-2 py-1" name="lateKind">
			<option>none</option><option>fixed</option><option>per_day</option><option>percent</option
			><option>one_time</option>
		</select>
	</label>
	<Field label="Late amount in paise" name="lateFeePaise" type="number" value="0" />
	<Field label="Late percent" name="latePercent" type="number" value="0" />
	<Field label="Grace days" name="graceDays" type="number" value="0" />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Save plan</button>
</form>

<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/invoice">
	<h2 class="font-medium">Issue invoice</h2>
	<label class="text-sm"
		>Student
		<select class="w-full rounded border px-2 py-1" name="studentId" required>
			{#each data.students as student (student.id)}
				<option value={student.id}>{student.firstName} {student.lastName}</option>
			{/each}
		</select>
	</label>
	<label class="text-sm"
		>Plan
		<select class="w-full rounded border px-2 py-1" name="feeStructureId" required>
			{#each data.plans as plan (plan.id)}
				<option value={plan.id}>{plan.name}</option>
			{/each}
		</select>
	</label>
	<Field label="Period" name="periodLabel" required />
	<Field label="Due date" name="dueOn" type="date" required />
	<Field label="Line label" name="label" required />
	<Field label="Line amount in paise" name="amountPaise" type="number" required />
	<Field label="Concession in paise" name="concessionPaise" type="number" value="0" />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Issue</button>
</form>

<form class="mt-6 grid max-w-xl gap-3" method="post" action="?/payment">
	<h2 class="font-medium">Offline payment</h2>
	<label class="text-sm"
		>Invoice
		<select class="w-full rounded border px-2 py-1" name="invoiceId" required>
			{#each data.invoices as invoice (invoice.id)}
				<option value={invoice.id}>{invoice.periodLabel} · {invoice.status}</option>
			{/each}
		</select>
	</label>
	<Field label="Amount in paise" name="amountPaise" type="number" required />
	<Field label="Reference" name="reference" required />
	<Field label="Received on" name="asOf" type="date" required />
	<button class="rounded-md bg-teal-800 px-4 py-2 text-white" type="submit">Record</button>
</form>
