<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import PanelPage from '#lib/components/PanelPage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function money(value: number) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(value);
	}
</script>

<PanelPage title="Fees & Payments" detail="Your fee details and payment history">
	<Alert message={form?.message} />
	{#if form?.saved}
		<p class="text-sm text-emerald-800" role="status">{form.saved}</p>
	{/if}
	<section class="grid gap-3 sm:grid-cols-3">
		<article class="rounded-2xl bg-[#eef4ff] p-4">
			<p class="text-xs text-slate-500">Total fees</p>
			<p class="text-2xl font-bold">{money(data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0))}</p>
		</article>
		<article class="rounded-2xl bg-[#e9fbf3] p-4">
			<p class="text-xs text-slate-500">Paid</p>
			<p class="text-2xl font-bold">{money(data.invoices.reduce((sum, invoice) => sum + invoice.paid, 0))}</p>
		</article>
		<article class="rounded-2xl bg-[#fff1f2] p-4">
			<p class="text-xs text-slate-500">Pending</p>
			<p class="text-2xl font-bold">{money(data.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.balance), 0))}</p>
		</article>
	</section>
	<div class="overflow-x-auto rounded-2xl bg-white shadow-sm">
		<table class="w-full min-w-[640px] text-left text-sm">
			<thead class="text-xs text-slate-400">
				<tr><th class="px-3 py-3">Fee</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each data.invoices as invoice (invoice.id)}
					<tr class="border-t border-slate-100">
						<td class="px-3 py-3 font-medium">{invoice.label}</td>
						<td>{money(invoice.amount)}</td>
						<td>{money(invoice.paid)}</td>
						<td>{money(invoice.balance)}</td>
						<td>{invoice.dueOn}</td>
						<td><span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{invoice.status.replaceAll('_', ' ')}</span></td>
					</tr>
				{:else}
					<tr><td class="px-3 py-8 text-slate-500" colspan="6">No fee invoice yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.invoices.some((invoice) => invoice.balance > 0)}
		<form class="grid gap-3 rounded-2xl bg-white p-5 shadow-sm" method="post" action="?/pay">
				<h2 class="font-semibold text-slate-900">Pay online</h2>
				<label class="grid gap-1 text-sm">
					<span class="font-medium text-slate-700">Invoice</span>
					<select class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="invoiceId" required>
						{#each data.invoices.filter((invoice) => invoice.balance > 0) as invoice (invoice.id)}
							<option value={invoice.id}>{invoice.label}</option>
						{/each}
					</select>
				</label>
				<label class="grid gap-1 text-sm">
					<span class="font-medium text-slate-700">Amount in rupees</span>
					<input class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" name="amountRupees" type="number" min="1" step="1" required />
				</label>
				<button class="rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white" type="submit">
					Start payment
				</button>
			</form>
	{/if}
	{#if data.payments.length > 0}
		<section class="rounded-3xl bg-white p-5 shadow-sm">
			<h2 class="font-semibold text-slate-900">Payments</h2>
			<ul class="mt-3 grid gap-2 text-sm">
				{#each data.payments as payment (payment.id)}
					<li class="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
						<span class="capitalize">{payment.status} · {money(payment.amount)}</span>
						{#if payment.status === 'succeeded'}
							<a class="font-semibold text-teal-800" href={resolve('/family/receipt/[id]', { id: payment.id })}>Receipt</a>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</PanelPage>
