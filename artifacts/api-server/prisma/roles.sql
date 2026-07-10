-- Run BEFORE the first migration.
-- The application role must not be able to rewrite history.
--
-- Replit adaptation: roles are created NOLOGIN with no passwords. The app
-- connects with the platform-managed credentials in DATABASE_URL; these
-- roles exist to carry the privilege split (migrator owns objects, app gets
-- restricted DML) rather than to be logged into directly. On a self-managed
-- Postgres you would instead create LOGIN roles with strong, secret-managed
-- passwords and grant CONNECT on your database to them.

CREATE ROLE vedichemp_migrator NOLOGIN;
CREATE ROLE vedichemp_app      NOLOGIN;

-- Grant CONNECT on the current database (no hardcoded database name).
DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO vedichemp_app, vedichemp_migrator',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO vedichemp_app, vedichemp_migrator;

-- Migrator owns the objects and may alter them.
ALTER DEFAULT PRIVILEGES FOR ROLE vedichemp_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vedichemp_app;

-- Migration 0001 then REVOKEs UPDATE/DELETE on the WORM tables from vedichemp_app.
-- Row-level security is enabled per-table in migration 0002 (data isolation, NFR-S-10).
