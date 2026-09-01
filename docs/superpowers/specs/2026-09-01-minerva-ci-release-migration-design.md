# Minerva CI, Release, and Legacy Naming Design

## Goals

- Make the macOS CI unit-test job pass for the failures reported by GitHub run 33474332545.
- Make the Playwright report merge job robust when an upstream shard fails or produces no usable blob.
- Publish exactly one Windows installer asset and one macOS download asset from the release workflow.
- Ensure repository-owned links and release verification target JiaTang-cs/Minerva.
- Rename application-owned Dyad branding and identifiers to Minerva while preserving legacy `.dyad`, `dyad-*`, and `@dyad-sh/*` compatibility identifiers.

## Design

The unit-test fixes will align test doubles with the current media directory constant and make local-agent validation perform deterministic settings checks before chat-dependent work. Prompt snapshots will be regenerated only after the prompt source is verified.

The merge job will explicitly inspect downloaded blob files. If none are present, it will create a small diagnostic HTML report and continue to the summary step; if files are present, Playwright will merge them normally. This prevents a failed shard from creating a second, opaque failure.

The release workflow will build Windows and macOS only. The Forge configuration will continue to build platform-specific artifacts, while the workflow will select the intended Windows installer and a macOS zip asset. The release verifier will check those two assets against the current repository and will not require Linux artifacts.

Application-facing names, repository URLs, workflow labels, and environment variable names will use Minerva where changing them is safe. Legacy protocol tags, data directories, and external package names remain unchanged and are documented as compatibility surface.

## Verification

Run formatting checks, lint, TypeScript checks, unit tests, a local package build where the host supports it, and static checks for release workflow and repository ownership. Re-scan for stale repository ownership references and distinguish remaining legacy compatibility markers.
