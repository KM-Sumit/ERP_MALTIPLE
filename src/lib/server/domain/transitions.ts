export const statusTransitions = {
	user: {
		active: ['disabled'],
		disabled: ['active']
	},
	school: {
		active: ['suspended', 'archived'],
		suspended: ['active', 'archived'],
		archived: []
	},
	membership: {
		invited: ['active', 'suspended'],
		active: ['suspended'],
		suspended: ['active']
	},
	invitation: {
		pending: ['accepted', 'revoked', 'expired'],
		accepted: [],
		revoked: [],
		expired: []
	},
	academic_session: {
		planned: ['active', 'closed'],
		active: ['closed'],
		closed: []
	},
	student: {
		active: ['withdrawn', 'alumni'],
		withdrawn: ['active', 'alumni'],
		alumni: []
	},
	enrollment: {
		active: ['completed', 'withdrawn'],
		completed: [],
		withdrawn: ['active']
	},
	exam: {
		draft: ['scheduled', 'cancelled'],
		scheduled: ['published', 'cancelled'],
		published: ['completed', 'cancelled'],
		completed: [],
		cancelled: []
	},
	report_card: {
		draft: ['approved', 'published'],
		approved: ['published'],
		published: ['revised'],
		revised: ['published']
	},
	leave: {
		pending: ['approved', 'rejected', 'cancelled'],
		approved: [],
		rejected: [],
		cancelled: []
	},
	invoice: {
		draft: ['issued', 'void'],
		issued: ['partially_paid', 'paid', 'void'],
		partially_paid: ['paid', 'void'],
		paid: ['partially_paid', 'issued'],
		void: []
	},
	payment: {
		pending: ['succeeded', 'failed'],
		succeeded: [],
		failed: []
	},
	complaint: {
		open: ['in_review', 'closed'],
		in_review: ['assigned', 'resolved', 'closed'],
		assigned: ['resolved', 'in_review'],
		resolved: ['in_review', 'closed'],
		closed: []
	},
	document_request: {
		pending: ['ready', 'rejected'],
		ready: ['collected'],
		rejected: [],
		collected: []
	},
	course: {
		draft: ['published', 'archived'],
		published: ['archived'],
		archived: []
	}
} as const;

export type StatusDomain = keyof typeof statusTransitions;

export class StatusTransitionError extends Error {
	constructor(
		readonly domain: StatusDomain,
		readonly from: string,
		readonly to: string
	) {
		super(`invalid ${domain} status transition: ${from} -> ${to}`);
		this.name = 'StatusTransitionError';
	}
}

export function canTransition(domain: StatusDomain, from: string, to: string): boolean {
	const allowed = statusTransitions[domain] as Record<string, readonly string[]>;
	return (allowed[from] ?? []).includes(to);
}

export function assertStatusTransition(domain: StatusDomain, from: string, to: string): void {
	if (!canTransition(domain, from, to)) {
		throw new StatusTransitionError(domain, from, to);
	}
}
