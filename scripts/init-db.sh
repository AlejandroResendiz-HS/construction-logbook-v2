
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-myapp}"
DB_USER="${DB_USER:-myapp_user}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"

# Validate SQL identifiers
for identifier in "$DB_NAME" "$DB_USER"; do
  if [[ ! "$identifier" =~ ^[a-z_][a-z0-9_]*$ ]]; then
    echo "Invalid identifier: $identifier" >&2
    exit 1
  fi
done

# Create role if it doesn't exist
sudo -u postgres psql \
  -v ON_ERROR_STOP=1 \
  -v db_user="$DB_USER" \
  -v db_password="$DB_PASSWORD" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L',
  :'db_user',
  :'db_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'db_user'
)
\gexec
SQL

# Create database if it doesn't exist
sudo -u postgres psql \
  -v ON_ERROR_STOP=1 \
  -v db_name="$DB_NAME" \
  -v db_user="$DB_USER" <<'SQL'
SELECT format(
  'CREATE DATABASE %I OWNER %I',
  :'db_name',
  :'db_user'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'db_name'
)
\gexec
SQL

echo "Database '$DB_NAME' ready."
