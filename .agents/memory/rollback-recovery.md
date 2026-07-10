---
name: Rolled-back merge recovery
description: How to restore work when a previously merged task was rolled back and its files are missing from HEAD
---

**Rule:** If files from a previously merged task are missing (rollback restored an older checkpoint), recover them from the `gitsafe-backup/main` ref: `git archive <commit> | tar -x` for the needed paths.

**Why:** This happened in this project — a checkpoint rollback wiped the entire merged web artifact. The backup ref still held the full merged tree, so restoration was lossless.

**How to apply:**
- `.replit` is write-protected; do not try to restore it from the archive. Instead re-add missing modules (e.g. `postgresql-16`) via the package-management tools.
- Artifacts must be re-registered after restore (artifact.toml cannot be edited directly — use the artifact skill's verify/replace flow with a temp copy).
- After restoring this project's DB schema, re-apply `prisma/migrations/0001_prohibitions/migration.sql` and check `SELECT * FROM prohibition_status` shows all six enforced (see replit.md gotchas).
