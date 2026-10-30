import postgres from 'postgres';

const ownerUrl = process.env.DATABASE_URL;
const password = process.env.ERP_APP_PASSWORD;

if (!ownerUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}
if (!password) {
	console.error('ERP_APP_PASSWORD is not set');
	process.exit(1);
}
if (password.includes('$erpapppw$')) {
	console.error('ERP_APP_PASSWORD cannot contain $erpapppw$');
	process.exit(1);
}

const sql = postgres(ownerUrl, {
	max: 1,
	ssl: ownerUrl.includes('sslmode=require') || ownerUrl.includes('.supabase.') ? 'require' : undefined
});

const existing = await sql`select 1 from pg_roles where rolname = 'erp_app'`;
const statement = existing.length
	? `ALTER ROLE erp_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT PASSWORD $erpapppw$${password}$erpapppw$`
	: `CREATE ROLE erp_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT PASSWORD $erpapppw$${password}$erpapppw$`;
await sql.unsafe(statement);

const database = decodeURIComponent(new URL(ownerUrl).pathname.slice(1));
const quoted = `"${database.replaceAll('"', '""')}"`;
await sql.unsafe(`GRANT CONNECT ON DATABASE ${quoted} TO erp_app`);
await sql.unsafe(`GRANT USAGE ON SCHEMA public TO erp_app`);
await sql.end();
console.log('erp_app is ready');
