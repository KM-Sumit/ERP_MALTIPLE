<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import GridIcon from '#lib/components/GridIcon.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const child = $derived(data.selected);
</script>

<section class="rounded-2xl bg-white p-4 shadow-sm">
	<h2 class="text-lg font-semibold text-slate-900">Academic</h2>
	<div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-700">
		{#each [{ href: '#attendance', label: 'Attendance' }, { href: '#timetable', label: 'Class Schedule' }, { href: '#homework', label: 'Homework' }, { href: '#results', label: 'Result' }, { href: '#fees', label: 'Fees Paid' }, { href: '#materials', label: 'Notes' }, { href: '#complaints', label: 'Complaint' }, { href: '#documents', label: 'Bonafide' }, { href: '#notices', label: 'Notice' }] as item (item.href)}
			<a
				class="grid justify-items-center gap-2 rounded-2xl px-1 py-3 hover:bg-emerald-50"
				href={item.href}
			>
				<span
					class="grid h-12 w-12 place-items-center rounded-full border border-emerald-200 text-emerald-700"
				>
					<GridIcon label={item.label} href={item.href} />
				</span>
				{item.label}
			</a>
		{/each}
	</div>
</section>
<h1 class="mt-4 text-lg font-semibold text-slate-900">Your children</h1>
<Alert message={form?.message} />
{#if form?.saved}<p role="status" class="mt-2 text-sm text-emerald-800">{form.saved}</p>{/if}
{#if data.children.length === 0}
	<p class="mt-4 text-sm text-stone-600">No verified child is linked to this account.</p>
{:else}
	<nav class="mt-3 flex gap-2 overflow-x-auto" aria-label="Children">
		{#each data.children as item (item.id)}
			<a
				class="rounded-full border px-3 py-1 text-sm {child?.id === item.id
					? 'bg-teal-800 text-white'
					: ''}"
				href="{resolve('/family')}?student={item.id}"
			>
				{item.firstName}
				{item.lastName}
			</a>
		{/each}
	</nav>
	{#if child}
		<section class="mt-6" id="attendance">
			<h2 class="font-medium">Attendance</h2>
			{#if data.attendance.length === 0}<p class="text-sm text-stone-600">
					No attendance has been recorded.
				</p>{/if}
			<ul class="text-sm">
				{#each data.attendance as row (row.id)}<li>{row.attendanceDate} · {row.status}</li>{/each}
			</ul>
		</section>
		<section class="mt-6" id="timetable">
			<h2 class="font-medium">Class timetable</h2>
			{#if data.timetable.length === 0}<p class="text-sm text-stone-600">
					No published class timetable.
				</p>{/if}
			<ul class="text-sm">
				{#each data.timetable as row (row.timetable_entries.id)}<li>
						Day {row.timetable_entries.weekday} · {row.timetables.name}
					</li>{/each}
			</ul>
		</section>
		<section class="mt-6" id="homework">
			<h2 class="font-medium">Homework</h2>
			{#if data.homework.length === 0}<p class="text-sm text-stone-600">
					No published homework.
				</p>{/if}
			<ul class="text-sm">
				{#each data.homework as row (row.assignments.id)}<li>{row.assignments.title}</li>{/each}
			</ul>
		</section>
		<section class="mt-6" id="results">
			<h2 class="font-medium">Report cards</h2>
			{#if data.cards.length === 0}<p class="text-sm text-stone-600">
					Published report cards will appear here.
				</p>{/if}
			<ul class="text-sm">
				{#each data.cards as card (card.id)}
					<li>{card.grade ?? '-'} · {card.percentage ?? 'n/a'}%</li>
				{/each}
			</ul>
		</section>
		<section class="mt-6" id="fees">
			<h2 class="font-medium">Fees</h2>
			{#if data.invoices.length === 0}<p class="text-sm text-stone-600">No issued invoices.</p>{/if}
			<ul class="text-sm">
				{#each data.invoices as invoice (invoice.id)}
					{@const due =
						invoice.amountPaise -
						invoice.concessionPaise +
						invoice.lateFeePaise -
						invoice.waiverPaise -
						invoice.amountPaidPaise}
					<li>
						{invoice.periodLabel} · due {invoice.dueOn} · {invoice.status} · late fee {invoice.lateFeePaise}
						· concession {invoice.concessionPaise} · balance {due} paise
					</li>
				{/each}
			</ul>
			<h3 class="mt-3 text-sm font-medium">Payments</h3>
			<ul class="text-sm">
				{#each data.payments as payment (payment.id)}
					<li>
						{payment.status} · {payment.amountPaise} paise
						{#if payment.status === 'succeeded'}
							· <a href={resolve('/family/receipt/[id]', { id: payment.id })}>Receipt</a>
						{/if}
					</li>
				{/each}
			</ul>
			<form class="mt-3 grid gap-2" method="post" action="?/pay">
				<label class="text-sm"
					>Invoice
					<select class="w-full rounded border px-2 py-1" name="invoiceId" required>
						{#each data.invoices as invoice (invoice.id)}
							<option value={invoice.id}>{invoice.periodLabel}</option>
						{/each}
					</select>
				</label>
				<label class="text-sm"
					>Amount in paise
					<input
						class="w-full rounded border px-2 py-1"
						name="amountPaise"
						type="number"
						min="1"
						required
					/>
				</label>
				<button class="rounded-md border px-3 py-2 text-sm" type="submit"
					>Start online payment</button
				>
				<p class="text-sm text-stone-600">
					This stays pending until a signed gateway webhook confirms it. Checkout is available when
					Cashfree credentials are configured.
				</p>
			</form>
		</section>
		<section class="mt-6" id="materials">
			<h2 class="font-medium">Learning materials</h2>
			{#if data.materials.length === 0}<p class="text-sm text-stone-600">
					No published notes yet.
				</p>{/if}
			<ul class="text-sm">
				{#each data.materials as row (row.course_materials.id)}
					<li>{row.course_materials.title} · {row.course_materials.kind}</li>
				{/each}
			</ul>
		</section>
		<section class="mt-6" id="complaints">
			<h2 class="font-medium">Complaint history</h2>
			{#if data.complaints.length === 0}<p class="text-sm text-stone-600">No complaints.</p>{/if}
			<ul class="text-sm">
				{#each data.complaints as complaint (complaint.id)}
					<li>
						{complaint.subject} · {complaint.status}{complaint.resolutionNote
							? ` · ${complaint.resolutionNote}`
							: ''}
					</li>
				{/each}
			</ul>
		</section>
		<section class="mt-6" id="documents">
			<h2 class="font-medium">Document requests</h2>
			<ul class="text-sm">
				{#each data.documents as request (request.id)}
					<li>
						{request.docType} · {request.status}{request.reviewNote
							? ` · ${request.reviewNote}`
							: ''}
					</li>
				{/each}
			</ul>
		</section>
		<section class="mt-6" id="messages">
			<h2 class="font-medium">Messages</h2>
			<ul class="text-sm">
				{#each data.messages as message (message.id)}
					<li>{message.title}</li>
				{/each}
			</ul>
		</section>
		<section class="mt-6" id="notices">
			<h2 class="font-medium">Notices</h2>
			{#if data.notices.length === 0}<p class="text-sm text-stone-600">No notices.</p>{/if}
			<ul class="text-sm">
				{#each data.notices as notice (notice.id)}<li>{notice.title}</li>{/each}
			</ul>
		</section>
		<form class="mt-6 grid gap-2" method="post" action="?/document">
			<h2 class="font-medium">Document request</h2>
			<input type="hidden" name="studentId" value={child.id} />
			<label class="text-sm"
				>Type <input class="w-full rounded border px-2 py-1" name="docType" required /></label
			>
			<button class="rounded-md border px-3 py-2 text-sm" type="submit">Request</button>
		</form>
		<form class="mt-6 grid gap-2" method="post" action="?/complaint" enctype="multipart/form-data">
			<h2 class="font-medium">Complaint</h2>
			<input type="hidden" name="studentId" value={child.id} />
			<label class="text-sm"
				>Category
				<select class="w-full rounded border px-2 py-1" name="category">
					<option value="general">general</option>
					<option value="fees">fees</option>
					<option value="transport">transport</option>
					<option value="academic">academic</option>
				</select>
			</label>
			<label class="text-sm"
				>Priority
				<select class="w-full rounded border px-2 py-1" name="priority">
					<option value="low">low</option>
					<option value="normal" selected>normal</option>
					<option value="high">high</option>
				</select>
			</label>
			<label class="text-sm"
				>Subject <input class="w-full rounded border px-2 py-1" name="subject" required /></label
			>
			<label class="text-sm"
				>Message <textarea class="w-full rounded border px-2 py-1" name="body" required
				></textarea></label
			>
			<label class="text-sm"
				>Photo <input type="file" name="photo" accept="image/jpeg,image/png" /></label
			>
			<label class="text-sm"
				>Voice <input type="file" name="voice" accept="audio/webm,audio/wav" /></label
			>
			<label class="text-sm"
				>Document <input type="file" name="document" accept="application/pdf" /></label
			>
			<button class="rounded-md border px-3 py-2 text-sm" type="submit">Send</button>
		</form>
		<form class="mt-6 grid gap-2" method="post" action="?/preference">
			<h2 class="font-medium">Notifications</h2>
			<label class="text-sm"
				>Kind
				<select class="rounded border px-2 py-1" name="kind">
					<option value="timetable">timetable</option>
					<option value="exam">exam</option>
					<option value="results">results</option>
					<option value="attendance">attendance</option>
					<option value="notice">notice</option>
				</select>
			</label>
			<label class="text-sm"><input type="checkbox" name="enabled" checked /> Enabled</label>
			<button class="rounded-md border px-3 py-2 text-sm" type="submit">Save preference</button>
		</form>
	{/if}
{/if}
