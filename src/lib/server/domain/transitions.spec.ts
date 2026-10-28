import { describe, expect, it } from 'vitest';
import { canTransition, statusTransitions, type StatusDomain } from './transitions';

describe('status transitions', () => {
	it('allows each declared edge and blocks terminal states', () => {
		for (const domain of Object.keys(statusTransitions) as StatusDomain[]) {
			const table = statusTransitions[domain] as Record<string, readonly string[]>;
			for (const [from, targets] of Object.entries(table)) {
				for (const to of targets) {
					expect(canTransition(domain, from, to)).toBe(true);
				}
				if (targets.length === 0) {
					expect(canTransition(domain, from, 'active')).toBe(false);
				}
			}
		}
	});

	it('rejects skipping invoice draft straight to paid', () => {
		expect(canTransition('invoice', 'draft', 'paid')).toBe(false);
		expect(canTransition('invoice', 'issued', 'paid')).toBe(true);
	});
});
