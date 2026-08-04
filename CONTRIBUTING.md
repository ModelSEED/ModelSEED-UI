# Contributing to ModelSEED-UI

This is the single durable, in-repository reference for how changes flow
through the project: branching and release workflow, and the versioning /
changelog policy. Keep this file authoritative — do not duplicate this
policy elsewhere.

## Release workflow

Remotes: `origin` is the contributor's fork, `upstream` is
`ModelSEED/ModelSEED-UI`. Contributors write code and open/update pull
requests; **Seaver** reviews, merges, and deploys. Contributors do not have
deploy access and must never push directly to `upstream`.

For each change:

1. **Branch off `staging`**: `git switch staging && git switch -c fix/<slug>`
   (small/obvious changes may be committed straight onto local `staging`).
2. **Implement and verify** the change locally (lint, type-check, unit
   tests, build — see `docs/TESTING.md`), using Conventional Commit messages.
3. **Merge to local `staging`**: `git switch staging && git merge --no-ff fix/<slug>`.
4. **Push to the fork's `staging`**: `git push origin staging`.
5. **Open a pull request to upstream `staging`**: base
   `ModelSEED/ModelSEED-UI:staging`, head `<fork>:staging`. Then wait —
   Seaver reviews, merges, and deploys to **staging.modelseed.org**.
6. After validation on staging, Seaver merges upstream `staging` → `master`
   and deploys to **modelseed.org**. Contributors do not drive this step.

Confirm with the repository owner before any outward-facing step (pushing,
or opening/updating a pull request).

## Versioning, changelog & release classification

- **Classify every change** using Conventional Commits (`feat`, `fix`,
  `chore`, `docs`, etc.).
- **SemVer bump rule**: any commit set containing a `feat` → bump the minor
  version (`x.Y.0`); `fix`-only changes → bump the patch version (`x.y.Z`);
  a breaking change → bump the major version (`X.0.0`).
- **Every release bump must update, together, in the same change**:
  1. `VERSION.md` — the single version string (deploy source of truth,
     exported by `deploy_container.sh` as `NEXT_PUBLIC_GIT_VERSION` and
     synced into `package.json` by `scripts/sync-version-from-env.mjs`).
  2. `package.json`'s `"version"` field — must exactly match `VERSION.md`.
  3. `CHANGELOG.md` — add a new dated `## [x.y.z] - YYYY-MM-DD` section
     immediately above the previous release entry, with `### Added` /
     `### Changed` / `### Fixed` bullets describing user-visible impact.
     Keep `## [Unreleased]` at the top for in-progress/known issues.
- Ship the bump through the release workflow above (branch off `staging`,
  verify, merge to local `staging`, push, then PR to upstream `staging`).
