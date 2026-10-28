import { timestamp, uuid } from 'drizzle-orm/pg-core';

export function primaryId() {
	return uuid('id').primaryKey().defaultRandom();
}

export function createdAt() {
	return timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
}

export function updatedAt() {
	return timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
}

export function deletedAt() {
	return timestamp('deleted_at', { withTimezone: true });
}
