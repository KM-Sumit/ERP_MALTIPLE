<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Field from '#lib/components/Field.svelte';
	import RecordPage from '#lib/components/admin/RecordPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
	const query = $derived(page.url.searchParams.get('q')?.trim().toLowerCase() ?? '');
	const rows = $derived(
		data.invoices
			.map((invoice) => {
				const student = data.students.find((item) => item.id === invoice.studentId);
				const due = invoice.amountPaise - invoice.concessionPaise + invoice.lateFeePaise - invoice.waiverPaise;
				const balance = Math.max(0, due - invoice.amountPaidPaise);
				const overdue = balance > 0 && String(invoice.dueOn).slice(0, 10) < new Date().toISOString().slice(0, 10) && invoice.status !== 'void';
				return { invoice, student, due, balance, overdue };
			})
			.filter((row) => {
				const haystack = `${row.student?.firstName ?? ''} ${row.student?.lastName ?? ''} ${row.student?.admissionNo ?? ''} ${row.invoice.periodLabel}`.toLowerCase();
				return !query || haystack.includes(query);
			})
	);
	const billed = $derived(rows.reduce((sum, row) => sum + row.due, 0));
	const collected = $derived(data.collectedPaise);
	const pending = $derived(rows.reduce((sum, row) => sum + row.balance, 0));
	const overdueCount = $derived(rows.filter((row) => row.overdue).length);
	const percent = $derived(billed === 0 ? 0 : Math.min(100, Math.round((collected / billed) * 1000) / 10));

	function rupees(paise: number) {
		return money.format(Math.round(paise / 100));
	}
	function tone(status: string, overdue: boolean) {
		if (status === 'paid') return 'bg-emerald-50 text-emerald-700';
		if (overdue) return 'bg-rose-50 text-rose-700';
		if (status === 'partially_paid') return 'bg-amber-50 text-amber-700';
		return 'bg-slate-100 text-slate-600';
	}
</script>

<RecordPage
	crumb="Dashboard  /  Fees & Payments"
	title="Fees & Payments"
	detail="Manage student fees, payments, and generate receipts"
	stats={[
		{ label: 'Total Fees', value: rupees(billed), note: 'Issued invoices', tone: 'bg-[#eef4ff]' },
		{ label: 'Collected Amount', value: rupees(collected), note: billed ? `${percent}% of total` : 'No invoices yet', tone: 'bg-[#e9fbf3]' },
		{ label: 'Pending Amount', value: rupees(pending), note: 'Still to collect', tone: 'bg-[#fff1f2]' },
		{ label: 'Overdue Students', value: String(overdueCount), note: 'Past the due date', tone: 'bg-[#fff8e8]' }
	]}
>
	{#snippet actions()}
		<a class="rounded-lg bg-[#2f6bff] px-3 py-2 text-sm font-semibold text-white" href="#fee-record">+ Add Fee Record</a>
	{/snippet}
	<Alert message={form?.message} />
	{#if form?.saved}<p class="px-3 text-sm text-emerald-700" role="status">{form.saved}</p>{/if}
	<div class="overflow-x-auto">
		<table class="w-full min-w-[760px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">#</th><th>Student</th><th>Admission</th><th>Fee Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th></tr>
			</thead>
			<tbody>
				{#each rows as row, index (row.invoice.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3">{index + 1}</td>
						<td class="font-medium">{row.student ? `${row.student.firstName} ${row.student.lastName}` : 'Student'}</td>
						<td>{row.student?.admissionNo ?? '—'}</td>
						<td>{row.invoice.periodLabel}</td>
						<td>{rupees(row.due)}</td>
						<td>{rupees(row.invoice.amountPaidPaise)}</td>
						<td>{rupees(row.balance)}</td>
						<td><span class="rounded-full px-2 py-0.5 text-xs font-semibold {tone(row.invoice.status, row.overdue)}">{row.overdue ? 'Overdue' : row.invoice.status.replaceAll('_', ' ')}</span></td>
						<td>{row.invoice.dueOn}</td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="9">No fee records yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div id="fee-record" class="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-3">
		<form class="grid gap-2 text-sm" method="post" action="?/plan">
			<h2 class="font-semibold">Fee plan</h2>
			<select class="rounded-lg border px-2 py-1.5" name="sessionId" required>
				{#each data.sessions as session (session.id)}<option value={session.id}>{session.name}</option>{/each}
			</select>
			<Field label="Name" name="name" required />
			<Field label="Amount in paise" name="amountPaise" type="number" required />
			<select class="rounded-lg border px-2 py-1.5" name="category"><option>tuition</option><option>admission</option><option>transport</option><option>examination</option><option>other</option></select>
			<select class="rounded-lg border px-2 py-1.5" name="schedule"><option>monthly</option><option>quarterly</option><option>half_yearly</option><option>annual</option></select>
			<input type="hidden" name="lateKind" value="none" />
			<input type="hidden" name="lateFeePaise" value="0" />
			<input type="hidden" name="latePercent" value="0" />
			<input type="hidden" name="graceDays" value="0" />
			<button class="rounded-lg bg-[#2f6bff] px-3 py-2 font-semibold text-white" type="submit">Save plan</button>
		</form>
		<form class="grid gap-2 text-sm" method="post" action="?/invoice">
			<h2 class="font-semibold">Issue invoice</h2>
			<select class="rounded-lg border px-2 py-1.5" name="studentId" required>
				{#each data.students as student (student.id)}<option value={student.id}>{student.firstName} {student.lastName}</option>{/each}
			</select>
			<select class="rounded-lg border px-2 py-1.5" name="feeStructureId" required>
				{#each data.plans as plan (plan.id)}<option value={plan.id}>{plan.name}</option>{/each}
			</select>
			<Field label="Period" name="periodLabel" required />
			<Field label="Due date" name="dueOn" type="date" required />
			<Field label="Line label" name="label" required />
			<Field label="Line amount in paise" name="amountPaise" type="number" required />
			<Field label="Concession in paise" name="concessionPaise" type="number" value="0" />
			<button class="rounded-lg border px-3 py-2" type="submit">Issue</button>
		</form>
		<form class="grid gap-2 text-sm" method="post" action="?/payment">
			<h2 class="font-semibold">Offline payment</h2>
			<select class="rounded-lg border px-2 py-1.5" name="invoiceId" required>
				{#each data.invoices as invoice (invoice.id)}<option value={invoice.id}>{invoice.periodLabel} · {invoice.status}</option>{/each}
			</select>
			<Field label="Amount in paise" name="amountPaise" type="number" required />
			<Field label="Reference" name="reference" required />
			<Field label="Received on" name="asOf" type="date" required />
			<button class="rounded-lg border px-3 py-2" type="submit">Record</button>
		</form>
	</div>
	{#snippet side()}
		<h2 class="font-bold">Fee Collection Overview</h2>
		<p class="mt-4 text-center text-3xl font-bold text-emerald-600">{percent}%</p>
		<p class="text-center text-xs text-slate-500">Collected</p>
		<div class="mt-3 h-3 overflow-hidden rounded-full bg-emerald-100"><div class="h-full rounded-full bg-emerald-500" style:width="{Math.min(percent, 100)}%"></div></div>
		<ul class="mt-4 space-y-2 text-sm">
			<li class="flex justify-between"><span>Collected</span><strong>{rupees(collected)}</strong></li>
			<li class="flex justify-between"><span>Pending</span><strong>{rupees(pending)}</strong></li>
			<li class="flex justify-between"><span>Total</span><strong>{rupees(billed)}</strong></li>
		</ul>
	{/snippet}
</RecordPage>
