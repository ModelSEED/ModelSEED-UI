# ModelSEED-UI Directory Index

This file is the primary map of the repository. Use this to quickly locate relevant folders and configurations.

## Root Configuration Files

| File | Purpose |
| :--- | :--- |
| [README.md](./README.md) | Project overview, setup instructions, and primary context. |
| [issues.md](./issues.md) | Current known bugs and backend limitations. |
| [AGENTS.md](./AGENTS.md) | Active agent configurations and methodologies. |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | Project-specific rules and guidelines. |
| [CHANGELOG.md](./CHANGELOG.md) | Record of version changes and feature additions. |

## Subsystem Directories

Each directory contains a specific domain of the application and has its own `README.md` file detailing its contents and architecture.

| Directory | Purpose | Documentation |
| :--- | :--- | :--- |
| `app/` | Next.js App Router UI, pages, and route logic. | [app/README.md](./app/README.md) |
| `components/` | Reusable UI components (MUI v7), layouts, and auth wrappers. | [components/README.md](./components/README.md) |
| `lib/` | API clients, configurations, theme definitions, and utility scripts. | [lib/README.md](./lib/README.md) |
| `docs/` | Deep-dive technical manuals, architecture guidelines, and logic specs. | [docs/README.md](./docs/README.md) |
| `types/` | Global TypeScript type declarations and interfaces. | [types/README.md](./types/README.md) |
| `scripts/` | Standalone scripts for maintenance, cleanup, or data fetching. | [scripts/README.md](./scripts/README.md) |
| `public/` | Static media, icons, and assets. | [public/README.md](./public/README.md) |
| `tests/` | Playwright E2E and Vitest unit testing configurations and suites. | [tests/README.md](./tests/README.md) |
| `test-data/` | Mock JSON responses and static structure definitions for tests. | [test-data/README.md](./test-data/README.md) |
| `legacy/` | Externa or outdated dependencies, previous implementation phases, and legacy codebase artifacts. | [legacy/README.md](./legacy/README.md) |

## State and Planning

| Directory | Purpose |
| :--- | :--- |
| `.gsd/` | Project roadmap, current state, and specific agent tasks. |
| `.agent/` | Skills, workflows, and rules for AI agents. |

Please navigate to individual folder `README.md` files for deeper domain information.
