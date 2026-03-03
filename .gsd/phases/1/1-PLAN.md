---
phase: 1
plan: 1
wave: 1
updated_at: 2026-03-03T09:00:34-06:00
---

# Plan 1.1: Asset Migration

## Objective
Transfer and organize static assets (images, fonts, icons) from the legacy ModelSEED-UI codebase to the modern Next.js `public` directory, ensuring no loss of visual fidelity.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- external/ModelSEED-UI/img/
- external/ModelSEED-UI/icomoon/

## Tasks

<task type="auto">
  <name>Migrate Images</name>
  <files>public/img/*</files>
  <action>
    Copy all static image assets from `external/ModelSEED-UI/img` to `public/img`.
    - Retain original filenames and folder structures inside `img`.
    - Avoid changing image formats at this stage.
  </action>
  <verify>ls -1q public/img | wc -l</verify>
  <done>All image files successfully exist within the Next.js `public/img` structure.</done>
</task>

<task type="auto">
  <name>Migrate Fonts and Icons</name>
  <files>public/icomoon/*</files>
  <action>
    Copy the `icomoon` font assets from `external/ModelSEED-UI/icomoon` to `public/icomoon`.
    - Ensure font files (.woff, .ttf, .svg, .eot) and their styling are preserved.
  </action>
  <verify>ls -1q public/icomoon | wc -l</verify>
  <done>All font and icomoon assets are available in the public directory.</done>
</task>

## Success Criteria
- [ ] Next.js `public/img` contains all legacy images.
- [ ] Next.js `public/icomoon` contains all legacy icomoon assets.
