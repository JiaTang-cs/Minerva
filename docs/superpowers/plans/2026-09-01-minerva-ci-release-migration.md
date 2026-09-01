# Minerva CI, Release, and Naming Migration Plan

1. Inventory current repository ownership references and all non-legacy Dyad references.
2. Add or adjust regression tests for media cleanup, local-agent validation order, merge-report empty input behavior, and release asset selection.
3. Run focused tests in the failing state where practical, then implement the minimal fixes and update snapshots.
4. Harden `.github/workflows/ci.yml` merge handling and validate YAML expressions/scripts locally.
5. Simplify `.github/workflows/release.yml` to Windows and macOS assets and update `scripts/verify-release-assets.js`.
6. Apply the safe Minerva rename to application-owned source, docs, templates, workflows, metadata, and repository URLs; preserve and annotate legacy compatibility identifiers.
7. Run the full verification checklist and review the final diff for accidental protocol or dependency changes.
