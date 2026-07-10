-- Run BEFORE the first migration, as a superuser.
-- The application role must not be able to rewrite history.

CREATE ROLE vedichemp_migrator LOGIN PASSWORD 'CHANGEME';
CREATE ROLE vedichemp_app      LOGIN PASSWORD 'CHANGEME';

GRANT CONNECT ON DATABASE vedichemp TO vedichemp_app, vedichemp_migrator;
GRANT USAGE   ON SCHEMA public      TO vedichemp_app, vedichemp_migrator;

-- Migrator owns the objects and may alter them.
ALTER DEFAULT PRIVILEGES FOR ROLE vedichemp_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vedichemp_app;

-- Migration 0001 then REVOKEs UPDATE/DELETE on the WORM tables from vedichemp_app.
-- Row-level security is enabled per-table in migration 0002 (data isolation, NFR-S-10).
