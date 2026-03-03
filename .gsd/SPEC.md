# ModelSEED UI Spec

**Status**: FINALIZED

## Objective
Recreate the ModelSEED-UI (https://modelseed.org/) using a modern, secure tech stack while maintaining identical visual appearance and UI/UX flows.

## Tech Stack
- **Environment**: Node Version Manager (nvm) 0.40.3
- **Runtime**: Node.js v22.17.0 (LTS)
- **Package Manager**: npm 10.9.2
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript v5.0.0+ (Strict type safety for scientific data structures)
- **Core Library**: React 19.2.3
- **UI Framework**: @mui/material ^7.3.8, @emotion/react ^11.14.0, @emotion/styled ^11.14.1
- **State Management**: zustand ^5.0.11
- **Data Fetching**: @tanstack/react-query ^5.90.21

## Constraints
- **Do not copy legacy code:** The code in `external/ModelSEED-UI` is strictly for reference (understanding visual layout, CSS behavior, and assets).
- **Modern implementation:** All components must be rewritten using Next.js 16 (App Router), MUI v7, and modern React patterns (hooks, server components).
- **Security & Quality:** Leverage modern stack capabilities for improved security, performance, and code maintainability.
