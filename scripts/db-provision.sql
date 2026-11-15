-- Optional one-time provisioning template. Run as a PostgreSQL administrator,
-- replace the role names if needed, and set passwords outside source control.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'construction_logbook_migrator') THEN
    CREATE ROLE construction_logbook_migrator LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'construction_logbook_app') THEN
    CREATE ROLE construction_logbook_app LOGIN;
  END IF;
END $$;

DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO construction_logbook_migrator, construction_logbook_app', current_database());
END $$;
GRANT CREATE, USAGE ON SCHEMA public TO construction_logbook_migrator;
GRANT USAGE ON SCHEMA public TO construction_logbook_app;

ALTER DEFAULT PRIVILEGES FOR ROLE construction_logbook_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO construction_logbook_app;
ALTER DEFAULT PRIVILEGES FOR ROLE construction_logbook_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO construction_logbook_app;

-- After db:migrate, grant access to the Better Auth schema and existing objects:
-- GRANT USAGE ON SCHEMA auth TO construction_logbook_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, auth TO construction_logbook_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, auth TO construction_logbook_app;
