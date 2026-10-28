#!/bin/sh
# Local PostgreSQL for migrations and tenant-isolation tests.
# The cluster lives in .local/pg and is not part of the application.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PG=/usr/lib/postgresql/18/bin
DATA="$ROOT/.local/pg"
PORT=54329

if [ ! -x "$PG/initdb" ]; then
	echo "PostgreSQL 18 binaries were not found at $PG" >&2
	exit 1
fi

if [ ! -d "$DATA" ]; then
	mkdir -p "$ROOT/.local"
	"$PG/initdb" -D "$DATA" -U postgres --auth-local=trust --auth-host=trust >/dev/null
	cat >> "$DATA/postgresql.conf" <<EOF
listen_addresses = '127.0.0.1'
port = $PORT
unix_socket_directories = '$DATA'
EOF
fi

if ! "$PG/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
	"$PG/pg_ctl" -D "$DATA" -l "$DATA/server.log" -w start
fi

PSQL="$PG/psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "SELECT 1" >/dev/null
$PSQL -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'school_erp'" | grep -q 1 \
	|| $PSQL -d postgres -c "CREATE DATABASE school_erp"
$PSQL -d school_erp -c "DO \$\$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
		CREATE ROLE erp_app LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
	ELSE
		ALTER ROLE erp_app LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
	END IF;
END \$\$;"
echo "school_erp is ready on 127.0.0.1:$PORT"
echo "migrate: MIGRATION_DATABASE_URL=postgres://postgres@127.0.0.1:$PORT/school_erp npm run db:migrate"
echo "runtime: DATABASE_URL=postgres://erp_app@127.0.0.1:$PORT/school_erp"
