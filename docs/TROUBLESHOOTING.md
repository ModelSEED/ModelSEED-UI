# Troubleshooting Guide

This guide covers common issues encountered during development and deployment of the ModelSEED-UI application.

## Table of Contents

- [Backend Connection Issues](#backend-connection-issues)
- [Authentication Issues](#authentication-issues)
- [Data Display Issues](#data-display-issues)
- [Build and Development Issues](#build-and-development-issues)
- [Testing Issues](#testing-issues)

---

## Backend Connection Issues

### Version Page Shows Endpoints as "Error"

**Symptoms:**
- Visit `/about/version` page
- API endpoint status shows "error" for all endpoints
- Red error indicators in status table

**Root Cause:** SSH tunnel to Poplar API server is not active.

**Solution:**

1. **Start SSH Tunnel:**
   ```bash
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   ```

2. **Keep Terminal Open:** The tunnel must remain active while developing. If you close the terminal, the tunnel dies and endpoints become unavailable.

3. **Verify Connection:**
   ```bash
   curl http://localhost:8000/health
   # Should return: 200 OK with health status JSON
   ```

4. **Check Environment Variable:**
   In `.env.local`:
   ```bash
   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
   ```

5. **Restart Dev Server:** After changing `.env.local`, restart:
   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

---

### Media Tab is Empty (`/list-media`)

**Symptoms:**
- Navigate to `/list-media` page
- No media items appear in the table
- May see timeout errors in console
- Loading spinner never completes

**Root Cause:** Backend API not responding (usually SSH tunnel not active).

**Solution:**

1. **Check SSH Tunnel:** See "Version Page Shows Endpoints as Error" above.

2. **Test API Directly:**
   ```bash
   # With tunnel active, should return JSON array of media
   curl http://localhost:8000/api/media/public
   ```

3. **Check Feature Flags:**
   In `.env.local`, verify:
   ```bash
   NEXT_PUBLIC_USE_MODELSEED_API=true
   NEXT_PUBLIC_USE_NEW_PROXY=true
   ```

4. **Try Workspace Fallback:**
   If API is down, can fall back to legacy workspace:
   ```bash
   NEXT_PUBLIC_USE_MODELSEED_API=false
   ```
   Then restart dev server.

5. **Check Network Tab:**
   - Open browser DevTools → Network tab
   - Refresh `/list-media` page
   - Look for failed requests to `/api/media/public`
   - Check response status and error messages

---

### Cannot Connect to SSH Tunnel

**Symptoms:**
- SSH command hangs or fails
- "Connection refused" or "Host key verification failed"

**Solution:**

1. **Verify Network Access:**
   ```bash
   ping poplar.cels.anl.gov
   ```

2. **Check SSH Key:**
   ```bash
   ssh-add -l  # List loaded keys
   ssh-add ~/.ssh/id_rsa  # Add your key if needed
   ```

3. **Test Basic SSH Connection:**
   ```bash
   ssh user@poplar.cels.anl.gov
   # Should connect without tunnel first
   ```

4. **Check Port Availability:**
   ```bash
   lsof -i :8000  # See if port 8000 is already in use
   # If in use, kill the process or use a different port
   ```

5. **Use Alternative Port:**
   ```bash
   ssh -L 8001:localhost:8000 user@poplar.cels.anl.gov
   # Then update .env.local:
   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8001
   ```

---

## Authentication Issues

### Login Fails with PATRIC or RAST Credentials

**Symptoms:**
- Enter username/password
- Get "Authentication failed" error
- Cannot access user data pages

**Possible Causes:**
1. Incorrect credentials
2. Network connectivity to auth servers
3. Auth server temporarily down
4. SSH tunnel required for some auth flows

**Solution:**

1. **Verify Credentials:**
   - Try logging in at https://www.patricbrc.org/
   - Try logging in at https://rast.nmpdr.org/
   - Confirm credentials work on official sites first

2. **Check Network Connectivity:**
   ```bash
   curl https://p3.theseed.org/services/auth/login
   # Should return a response (may be error about missing params, that's OK)
   ```

3. **Use Developer Bypass (Testing Only):**
   For local development without real auth:
   - Username: `developer`
   - Password: `developer`
   - Returns fixed token, doesn't hit real auth servers
   - **WARNING:** Only for local testing, not for production

4. **Check Console Errors:**
   - Open browser DevTools → Console
   - Look for specific error messages
   - Check Network tab for failed auth requests

---

### Different Models/Media Between RAST and PATRIC Accounts

**Symptom:** Same username shows different models/media lists when logging into RAST vs PATRIC.

**This is EXPECTED BEHAVIOR, not a bug.**

**Explanation:**
- RAST and PATRIC are **separate systems** with different workspace folders
- A PATRIC user cannot access RAST workspace data and vice versa
- Even with the same username, they point to different underlying directories
- Your RAST models live in the RAST workspace
- Your PATRIC models live in the PATRIC workspace
- There is no synchronization between the two systems

**Solution:** None needed. Choose the appropriate auth system for the data you want to access.

---

## Data Display Issues

### Reaction Page Missing Compound Structures

**Symptoms:**
- Navigate to reaction detail page (e.g., `/biochem/reactions/rxn00001`)
- See equation text but no compound structure images

**Possible Causes:**
1. Images not loaded yet (check for loading errors)
2. Compound IDs not parsed from equation
3. Image files don't exist for some compounds

**Solution:**

1. **Check Browser Console:**
   - Look for 404 errors loading compound images
   - Some compounds may not have images (expected)

2. **Verify Image URLs:**
   Images should load from:
   ```
   https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/{cpdID}.png
   ```

3. **Check Equation Format:**
   The compound ID parser expects format: `cpd00001`, `cpd12345`, etc.
   If equation uses different format, images won't load.

4. **Network Issues:**
   Test if image CDN is accessible:
   ```bash
   curl -I https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/cpd00001.png
   # Should return 200 OK or 404 (if compound has no image)
   ```

---

### Model Data Shows N/A for Equations or Gene Functions

**Symptoms:**
- Model detail page shows "N/A" for reaction equations
- Gene functions column is empty
- Organism/Taxonomy not saved

**This is a KNOWN BACKEND LIMITATION, not a frontend bug.**

**Documented Issues:**
1. **Equation column shows N/A** - Equations not returned in model data response
2. **Gene functions missing** - Not returned by model API
3. **Organism/Taxonomy not saved** - Reconstruct endpoint limitation

**Solution:** These require backend (`modelseed-api`) fixes. See `issues.md` for full documentation of known API limitations.

---

### Duplicate Model Rows in My Models

**Symptom:** Same model appears multiple times in "My Models" table.

**This is a KNOWN BACKEND LIMITATION.**

**Cause:** API returns same model multiple times in response.

**Workaround:** Use the first occurrence. This will be fixed in a future backend update.

---

## Build and Development Issues

### TypeScript Errors After Update

**Symptoms:**
- `npm run dev` shows TypeScript errors
- `npx tsc --noEmit` reports type errors

**Solution:**

1. **Clean and Reinstall:**
   ```bash
   rm -rf .next
   rm -rf node_modules
   rm -rf tsconfig.tsbuildinfo
   npm install
   ```

2. **Check TypeScript Version:**
   ```bash
   npm list typescript
   # Should match version in package.json
   ```

3. **Regenerate Type Definitions:**
   ```bash
   npx tsc --noEmit
   # Will show specific errors with file and line numbers
   ```

---

### Build Fails with Next.js Errors

**Symptoms:**
- `npm run build` fails
- Errors about server components, client components, or hydration

**Solution:**

1. **Clear Build Cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Check for Missing `'use client'` Directives:**
   - Components using hooks (useState, useEffect, etc.) need `'use client'` at top
   - Check error message for specific file

3. **Check for Async Component Issues:**
   - Server components can be async
   - Client components cannot be async
   - Verify proper component designation

4. **Verify Environment Variables:**
   ```bash
   # Build-time vars must be in .env.local or passed to build command
   npm run build
   ```

---

### Linter Errors or Warnings

**Symptoms:**
- `npm run lint` shows errors
- Many ESLint warnings

**Solution:**

1. **Auto-Fix What's Possible:**
   ```bash
   npm run lint -- --fix
   ```

2. **Check Specific Files:**
   ```bash
   npm run lint -- path/to/file.tsx
   ```

3. **Review ESLint Config:**
   Check `eslint.config.mjs` for rule configuration.

4. **Legacy Warnings:**
   Note: The codebase may have some pre-existing warnings that are not blockers. Focus on errors in your changes.

---

## Testing Issues

### E2E Tests Fail or Hang

**Symptoms:**
- `npm run test:e2e` hangs
- Playwright tests timeout
- Authentication failures in tests

**Solution:**

1. **Ensure Prerequisites:**
   ```bash
   # Terminal 1: Dev server
   npm run dev
   
   # Terminal 2: SSH tunnel
   ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
   
   # Terminal 3: Run tests
   npm run test:e2e
   ```

2. **Check Test Credentials:**
   In `.env.local`:
   ```bash
   PATRIC_USERNAME=your_username
   PATRIC_PASSWORD=your_password
   ```

3. **Run in Headed Mode (Debug):**
   ```bash
   npm run test:e2e:ui
   # Opens Playwright UI for debugging
   ```

4. **Check Specific Test:**
   ```bash
   npx playwright test tests/e2e/auth.spec.ts
   # Run one test file at a time
   ```

---

### Unit Tests Fail

**Symptoms:**
- `npm run test:run` shows failures
- Vitest errors

**Solution:**

1. **Run Tests in Watch Mode:**
   ```bash
   npm run test
   # Interactive mode, shows errors in real-time
   ```

2. **Check Test Files:**
   ```bash
   npm run test -- path/to/test.test.ts
   # Run specific test file
   ```

3. **Update Snapshots (if needed):**
   ```bash
   npm run test -- -u
   # Updates snapshots if UI changed intentionally
   ```

4. **Check Coverage:**
   ```bash
   npm run test:coverage
   # See which code is covered by tests
   ```

---

### CORS Errors with Solr

**Symptom:** Browser console shows CORS errors when fetching from `modelseed.org/solr`.

**This is EXPECTED in test environment.**

**Explanation:**
- Solr endpoint doesn't allow CORS from `localhost`
- Production build on correct domain works fine
- Tests handle CORS errors gracefully

**Workaround:** Tests that hit Solr should be run with proper production domain or mocked.

---

## Getting Help

If issues persist after trying these solutions:

1. **Check Known Issues:** See [`issues.md`](../issues.md) for documented backend limitations
2. **Review Architecture:** See [`ARCHITECTURE.md`](ARCHITECTURE.md) for system design
3. **Check Workspace Docs:** See [`WORKSPACE.md`](WORKSPACE.md) for API details
4. **Check Logs:** Look at browser console and terminal output for specific errors
5. **Ask for Help:** Provide:
   - Exact error message
   - Steps to reproduce
   - Browser and OS information
   - Whether SSH tunnel is active
   - Environment variable configuration

---

## Quick Reference

### Essential Commands

```bash
# Start development
npm run dev

# SSH tunnel (keep running)
ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov

# Test connection
curl http://localhost:8000/health

# Run tests
npm run test:run         # Unit tests
npm run test:e2e         # E2E tests (requires tunnel)

# Build
npm run build
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint
npm run lint -- --fix    # Auto-fix
```

### Essential Environment Variables

```bash
# .env.local
NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MODELSEED_API=true
NEXT_PUBLIC_USE_NEW_PROXY=true
PATRIC_USERNAME=your_username
PATRIC_PASSWORD=your_password
```

### Port Usage

- **3000**: Next.js dev server (`npm run dev`)
- **8000**: SSH tunnel to Poplar API (via `ssh -L 8000:localhost:8000`)
- **51204**: Vitest UI (if running `npm run test:ui`)
- **Various**: Playwright test servers (ephemeral)
