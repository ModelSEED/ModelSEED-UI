## Summary

<!-- What does this PR change and why? Link any related issue: Closes #123 -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Documentation / chore / CI

## Affected area(s)

<!-- e.g. FBA, Gapfill, Model viewer, Biochem browser, Media, Genomes, Auth, .github -->

## Release flow awareness

This repository ships **staging → production**:

- [ ] This PR targets `ModelSEED/ModelSEED-UI:staging` (not `master`).
- [ ] I understand staging is validated on **staging.modelseed.org** before it is merged
      to `master` and deployed to **modelseed.org** by a maintainer.
- [ ] This PR does **not** push directly to `upstream` `master`.

## Verification (must mirror CI — `.github/workflows/ci.yml`)

Run in the project conda env and check each:

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev --audit-level=high`

## Screenshots / recordings (UI changes)

<!-- Before / after for any user-facing change. -->

## Notes for reviewer

<!-- Anything the reviewer should focus on, deploy caveats, follow-ups. -->
