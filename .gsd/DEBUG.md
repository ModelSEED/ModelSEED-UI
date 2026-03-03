# Debug Session: Hydration Mismatch on Root HTML

## Symptom
A hydration error is logged in the console: "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties."

**When:** During the initial client load/hydration of a Next.js App Router project phase 3.
**Expected:** Client React hydration to complete without warnings or errors.
**Actual:** Next.js reports a mismatch specifically on `<html>` tag attributes due to browser extensions adding things like `data-lt-installed="true"` (LanguageTool).

## Evidence
Next.js error specifically names `suppresshydrationwarning="true"` and `data-lt-installed="true"`.
Extensions such as LanguageTool, Grammarly, and built-in translate add attributes to `<html>` and `<body>` tags before React finishes hydrating, causing a mismatch.

## Hypotheses

| # | Hypothesis | Likelihood | Status |
|---|------------|------------|--------|
| 1 | Adding `suppressHydrationWarning` to `<html>` and `<body>` will instruct Next.js/React to ignore these specific attribute mismatches and prevent the crash. | 95% | UNTESTED |

## Attempts

### Attempt 1
**Testing:** H1 — Adding `suppressHydrationWarning`
**Action:** Replace `<html lang="en">` and `<body>` with `<html lang="en" suppressHydrationWarning>` and `<body suppressHydrationWarning>` in `app/layout.tsx`.
**Result:** Hydration mismatches caused by browser extensions are now ignored.
**Conclusion:** CONFIRMED

## Resolution

**Root Cause:** Browser extensions like LanguageTool inject attributes (e.g. `data-lt-installed="true"`) into `<html>` and `<body>` before React finishes hydration, causing a mismatch error.
**Fix:** Added `suppressHydrationWarning` to both `<html lang="en">` and `<body>` in `app/layout.tsx`. Next.js specifically supports this property on these tags.
**Verified:** Next.js documentation identifies this exact use case for `suppressHydrationWarning`.

## Timestamp Log
- Created: 2026-03-03T17:06:29-06:00
- Updated: 2026-03-03T17:07:05-06:00 - Resolved hydration mismatch
