import { describe, expect, it } from 'vitest';
import { lateFeePaise, type LatePolicy } from './late-fee';

const base: LatePolicy = {
	kind: 'per_day',
	amountPaise: 100,
	percent: 0,
	graceDays: 0,
	maxPaise: null,
	countOnlyWorkingDays: false,
	workingDays: [1, 2, 3, 4, 5],
	holidays: []
};

describe('late fees', () => {
	it('charges nothing on the due date and respects grace, caps, and a later policy snapshot', () => {
		const bill = {
			principalPaise: 10_000,
			concessionPaise: 0,
			paidTowardPrincipalPaise: 0,
			dueOn: '2026-04-10',
			asOf: '2026-04-10'
		};
		expect(lateFeePaise(bill, base)).toBe(0);
		expect(lateFeePaise({ ...bill, asOf: '2026-04-13' }, { ...base, graceDays: 2 })).toBe(100);
		expect(lateFeePaise({ ...bill, asOf: '2026-04-20' }, { ...base, maxPaise: 250 })).toBe(250);
		expect(
			lateFeePaise({ ...bill, asOf: '2026-04-13' }, { ...base, kind: 'one_time', amountPaise: 500 })
		).toBe(500);
	});

	it('skips weekends and holidays and uses the unpaid principal for a percentage', () => {
		const fee = lateFeePaise(
			{
				principalPaise: 10_000,
				concessionPaise: 0,
				paidTowardPrincipalPaise: 4_000,
				dueOn: '2026-04-10',
				asOf: '2026-04-13'
			},
			{
				...base,
				kind: 'per_day',
				countOnlyWorkingDays: true,
				holidays: ['2026-04-13']
			}
		);
		expect(fee).toBe(0);
		expect(
			lateFeePaise(
				{
					principalPaise: 10_000,
					concessionPaise: 1_000,
					paidTowardPrincipalPaise: 4_000,
					dueOn: '2026-04-01',
					asOf: '2026-04-03'
				},
				{ ...base, kind: 'percent', percent: 10 }
			)
		).toBe(500);
	});
});
