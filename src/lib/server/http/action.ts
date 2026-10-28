import { fail, isRedirect } from '@sveltejs/kit';
import { AuthError } from '../auth/service';
import { TenantAccessError, pgCode } from '../authz/errors';
import { StatusTransitionError } from '../domain/transitions';

export function actionError(error: unknown) {
	if (isRedirect(error)) throw error;
	if (
		error instanceof AuthError ||
		error instanceof TenantAccessError ||
		error instanceof StatusTransitionError
	) {
		return fail(400, { message: error.message });
	}
	if (pgCode(error) === '23505') return fail(400, { message: 'That record already exists.' });
	if (pgCode(error) === '23514') return fail(400, { message: 'That change is not allowed.' });
	return fail(500, { message: 'The change could not be saved.' });
}

export function readPage(url: URL) {
	const page = Number(url.searchParams.get('page') ?? '1');
	const status = url.searchParams.get('status') ?? 'all';
	return {
		q: (url.searchParams.get('q') ?? '').trim(),
		status: ['all', 'active', 'suspended', 'archived'].includes(status) ? status : 'all',
		page: Number.isInteger(page) && page > 0 ? page : 1
	};
}
