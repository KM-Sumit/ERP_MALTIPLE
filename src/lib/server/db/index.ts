import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';
import type { AppDb } from './tenant';

let database: AppDb | undefined;

function needsSsl(connection: string) {
	return connection.includes('sslmode=require') || connection.includes('.supabase.');
}

/**
 * On Render, DATABASE_URL is the database owner used only for migrations.
 * ERP_APP_PASSWORD switches the running app to the erp_app login so row-level
 * security applies. Local development already puts erp_app in DATABASE_URL.
 */
export function runtimeDatabaseUrl(ownerUrl: string | undefined) {
	if (!ownerUrl) return undefined;
	const password = process.env.ERP_APP_PASSWORD;
	if (!password) return ownerUrl;
	const url = new URL(ownerUrl);
	// Supabase's pooler routes by `role.projectref`. Keep that suffix.
	const tenant = url.username.includes('.') ? url.username.slice(url.username.indexOf('.')) : '';
	url.username = `erp_app${tenant}`;
	url.password = password;
	return url.toString();
}

/**
 * Connects on first use. The welcome page does not import this module, so the
 * app still builds and serves when DATABASE_URL is absent. Runtime queries must
 * use the erp_app role; migrations use a privileged URL instead.
 */
export function getDb(): AppDb {
	const connection = runtimeDatabaseUrl(DATABASE_URL);
	if (!connection) throw new Error('DATABASE_URL is not set');
	if (!database) {
		database = drizzle(
			postgres(connection, {
				max: 10,
				ssl: needsSsl(connection) ? 'require' : undefined
			}),
			{ schema }
		);
	}
	return database;
}
