# App Directory (`/app`)

This directory contains the **Next.js App Router** structure for ModelSEED-UI.

## Structure
- `page.tsx`: The root home page.
- `layout.tsx`: The root layout containing HTML/Body tags and global providers.
- `globals.css`: Minimal global styling (managed primarily via Material UI theming).

## Guidelines
- Use **Server Components** by default for data fetching and static content.
- Use `'use client'` at the top of files that require interactivity or Material UI hooks.
- Routes are defined by creating subdirectories with their own `page.tsx`.
