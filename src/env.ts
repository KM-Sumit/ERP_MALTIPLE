import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'PostgreSQL URL for the erp_app role. Required when a query runs, not for the public page.',
		schema: (value) => value || undefined
	}
});
