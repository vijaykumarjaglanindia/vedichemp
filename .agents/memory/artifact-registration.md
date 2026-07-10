---
name: Registering an existing directory as an artifact
description: How to register pre-existing code (e.g. imported from GitHub) as a Replit artifact when createArtifact refuses existing dirs
---

**Rule:** To register an already-existing code directory as an artifact: move the dir aside (`/tmp`), run `createArtifact` with the desired slug/previewPath (it scaffolds and registers, assigning an id and port), delete the scaffold but keep its generated `.replit-artifact/artifact.toml`, move the real code back, then adjust the toml via `verifyAndReplaceArtifactToml`.

**Why:** `createArtifact` fails if `artifacts/<slug>/` exists, and `verifyAndReplaceArtifactToml` cannot create a registration from scratch — it rejects a missing/empty target (`NOT_FOUND`) and refuses to set/change the artifact `id` (`INVALID_ARTIFACT_ID`).

**How to apply / constraints of verifyAndReplaceArtifactToml:**
- Requires **absolute** paths for both `tempFilePath` and `artifactTomlPath`.
- Cannot change `id` — keep whatever `createArtifact` assigned.
- Cannot change `integratedSkills` — the scaffold's `[[integratedSkills]]` block (e.g. `react-vite`) must be copied verbatim even if the real app is a different framework (harmless: explicit build/run commands in the toml take precedence).
- Keep the assigned `localPort`; wire the app to it via `PORT` env in `[services.env]`.
- For a Next.js app under a path prefix: `BASE_PATH` env → `basePath` in next.config (strip trailing slash), `allowedDevOrigins` for the Replit proxy, production uses `next build`/`next start` with PORT/HOSTNAME/BASE_PATH in build+run env.
