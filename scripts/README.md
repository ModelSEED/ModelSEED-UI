# Scripts Directory (`/scripts`)

This directory contains standalone utility scripts for local development and backend testing.

## Overview

| Item | Description |
|------|-------------|
| `local/` | Developer-specific scripts (untracked). Useful for setup or experimental integration tasks. |
| `test-poplar-api.mjs` | Node.js script ensuring connectivity and basic REST responses from the `modelseed-api` (Poplar). |

## Usage Guidelines

- Execute scripts with `node scripts/<script-name>.mjs` from the repository root.
- Keep core application logic outside of this directory.
- Use the `.mjs` extension for ES Module support.
- Commit shared maintenance scripts; isolate transient scripts to `local/`.
