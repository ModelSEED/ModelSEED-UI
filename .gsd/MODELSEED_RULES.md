---
updated_at: 2026-03-03T08:51:04-07:59
---

# ModelSEED UI Transition Protocol

**CRITICAL DIRECTIVE:** The `external/ModelSEED-UI` directory contains the legacy code. You may **ONLY read from it** to understand the visual layout, features, and assets. You **MUST NOT** copy its implementation or use its outdated methodology.

**Goal:** Recreate the identical UI visual look, but modernized with the secure new stack.

## Tech Stack
Node Version Manager (nvm): 0.40.3
Node.js: v22.17.0 (LTS)
npm: 10.9.2
Next.js: 16.1.6 (App Router)
TypeScript: v5.0.0+ (Strict type safety)
React: 19.2.3
@mui/material: ^7.3.8
@emotion/react: ^11.14.0
@emotion/styled: ^11.14.1
zustand: ^5.0.11
@tanstack/react-query: ^5.90.21

## Process Constraints
- Never blindly reuse old code snippets from the external folder.
- Follow the GSD methodology for creating specific UI components using Next.js 16 and MUI 7.
