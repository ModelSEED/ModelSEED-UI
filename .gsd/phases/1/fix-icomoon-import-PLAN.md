---
phase: 1
plan: fix-icomoon-import
wave: 1
gap_closure: true
---

# Fix Plan: Icomoon CSS Import Resolution

## Problem
Next.js 16 failed to build because `app/globals.css` attempted to `@import url('/icomoon/style.css')`. Server relative imports are not implemented for standard CSS this way in the Turbopack Next.js App Router compiler.

## Tasks

<task type="auto">
  <name>Fix Icomoon Import Strategy</name>
  <files>app/globals.css, app/layout.tsx</files>
  <action>
    - Remove the `@import url('/icomoon/style.css');` line from `app/globals.css`.
    - Modify `app/layout.tsx` to include a standard HTML `<head>` tag holding `<link rel="stylesheet" href="/icomoon/style.css" />` before the `<body>`.
  </action>
  <verify>export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22.17.0 && npm run build</verify>
  <done>Next.js successfully builds without the module resolution error.</done>
</task>
