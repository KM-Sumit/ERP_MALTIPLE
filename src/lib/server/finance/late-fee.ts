export type LateKind = 'none' | 'fixed' | 'per_day' | 'percent' | 'one_time';

export type LatePolicy = {
	kind: LateKind;
	amountPaise: number;
	percent: number;
	graceDays: number;
	maxPaise: number | null;
	countOnlyWorkingDays: boolean;
	workingDays: number[];
	holidays: string[];
};

function parseDate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error('invalid fee date');
	return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate(time: number) {
	return new Date(time).toISOString().slice(0, 10);
}

function weekday(value: string) {
	return new Date(parseDate(value)).getUTCDay();
}

function datesThrough(start: string, end: string) {
	const dates: string[] = [];
	for (let time = parseDate(start); time <= parseDate(end); time += 86_400_000) {
		dates.push(formatDate(time));
	}
	return dates;
}

function chargeable(date: string, policy: LatePolicy) {
	if (!policy.countOnlyWorkingDays) return true;
	if (policy.holidays.includes(date)) return false;
	return policy.workingDays.includes(weekday(date));
}

export function lateFeePaise(
	input: {
		principalPaise: number;
		concessionPaise: number;
		paidTowardPrincipalPaise: number;
		dueOn: string;
		asOf: string;
	},
	policy: LatePolicy
) {
	if (policy.kind === 'none' || parseDate(input.asOf) <= parseDate(input.dueOn)) return 0;
	const afterDue = datesThrough(formatDate(parseDate(input.dueOn) + 86_400_000), input.asOf);
	let skipped = 0;
	let charged = 0;
	for (const date of afterDue) {
		if (skipped < policy.graceDays) {
			skipped += 1;
			continue;
		}
		if (chargeable(date, policy)) charged += 1;
	}
	if (charged === 0) return 0;
	const outstanding = Math.max(
		0,
		input.principalPaise - input.concessionPaise - input.paidTowardPrincipalPaise
	);
	let fee = 0;
	if (policy.kind === 'per_day') fee = policy.amountPaise * charged;
	if (policy.kind === 'fixed' || policy.kind === 'one_time') fee = policy.amountPaise;
	if (policy.kind === 'percent') fee = Math.floor((outstanding * policy.percent) / 100);
	if (policy.maxPaise != null) fee = Math.min(fee, policy.maxPaise);
	return Math.max(0, fee);
}
