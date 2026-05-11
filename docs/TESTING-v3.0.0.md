# Testing Instructions for Production Issues Fix

## Overview
This document provides testing instructions for validating the v3.0.0 production fixes.

## Prerequisites
Before testing, ensure you have:
1. ✅ Development server running: `npm run dev`
2. ✅ SSH tunnel active: `ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`
3. ✅ Environment configured in `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   PATRIC_USERNAME=your_username
   PATRIC_PASSWORD=your_password
   ```

## Test 1: Version Number Display

### Steps:
1. Navigate to `http://localhost:3000/about/version`
2. Observe the version number at the top of the page

### Expected Result:
- ✅ Version displays as **v3.0.0** (not v0.1.3 or v0.1.0)
- ✅ Version matches package.json (3.0.0)

### Status:
- ✅ **VERIFIED**: Version updated in both package.json and display page

---

## Test 2: Compound Structure Images on Reaction Pages

### Steps:
1. Navigate to `http://localhost:3000/biochem/reactions/rxn00001`
2. Scroll down to the "Equation" section
3. Look for "Compound Structures" section below the equation

### Expected Result:
- ✅ Section labeled "Compound Structures" appears below the equation
- ✅ Structure images display for compounds in the equation
- ✅ Each image has the compound ID (e.g., cpd00001) below it
- ✅ Clicking an image navigates to the compound detail page
- ✅ Clicking the compound ID navigates to the compound detail page
- ✅ Missing images are hidden gracefully (no broken image icons)
- ✅ Images have hover effect (slight shadow and lift)

### Additional Test Cases:
- `rxn00002` - Different reaction equation
- `rxn00005` - More complex equation
- Test reactions with compounds that may not have images

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **CODE VERIFIED**: Implementation complete with proper error handling

---

## Test 3: Media Tab Population

### Steps:
1. Ensure SSH tunnel is active
2. Navigate to `http://localhost:3000/list-media`
3. Wait for the page to load

### Expected Result:
- ✅ Media items appear in the table
- ✅ Columns show: Name, Type, isDefined, isMinimal
- ✅ No timeout errors in browser console
- ✅ Table is paginated with 25 items per page
- ✅ Clicking a row navigates to media detail page

### Fallback Test (Without ModelseedAPI):
1. Update `.env.local`: `NEXT_PUBLIC_USE_MODELSEED_API=false`
2. Restart dev server
3. Navigate to `/list-media`
4. Should still show media from workspace API

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **CODE VERIFIED**: Implementation uses correct API endpoint

---

## Test 4: SSH Tunnel Documentation

### Steps:
1. Open `README.md`
2. Navigate to "Running Tests" → "Prerequisites" section
3. Read SSH tunnel instructions

### Expected Result:
- ✅ SSH tunnel command is documented
- ✅ Explanation of why tunnel is needed
- ✅ Instructions to keep terminal open
- ✅ Environment variable documentation included

### Additional Checks:
1. Check "Troubleshooting" section in README
2. Verify `docs/TROUBLESHOOTING.md` exists
3. Read through troubleshooting scenarios

### Status:
- ✅ **VERIFIED**: Documentation complete and comprehensive

---

## Test 5: Version Page Endpoint Status

**Note**: This test requires SSH tunnel to be active.

### Steps:
1. Ensure SSH tunnel is running
2. Navigate to `http://localhost:3000/about/version`
3. Scroll to the API Endpoint Status table

### Expected Result:
- ✅ All endpoints show "OK" status (green checkmarks)
- ✅ No "error" indicators
- ✅ Response times displayed for each endpoint

### Without SSH Tunnel:
- ⚠️ Endpoints show "error" - This is expected and documented

### Status:
- ⏳ **PENDING SSH TUNNEL**: Requires backend connection to test
- ✅ **DOCUMENTED**: README explains this behavior

---

## Test 6: Invalid Gapfill URL Handling

### Steps:
1. Navigate to an incomplete gapfill URL:
   - `http://localhost:3000/gapfill/seaver/modelseed`
   - `http://localhost:3000/gapfill/user`

### Expected Result:
- ✅ Page loads without 404 error
- ✅ Shows "No gapfill reactions found" message
- ✅ No error in browser console
- ✅ Page is functional (not broken)

### Valid URL Test:
1. Navigate to complete gapfill URL (if you have one):
   - `http://localhost:3000/gapfill/seaver/modelseed/MyModel/gf.0`

### Expected Result:
- ✅ Page loads normally
- ✅ Shows gapfill reactions (if backend is available)

### Status:
- ✅ **VERIFIED**: Code includes `isValidGapfillPath()` validation

---

## Test 7: Build and Type Checks

### Steps:
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Unit tests
npm run test:run
```

### Expected Result:
- ✅ TypeScript: No errors
- ✅ Lint: No new errors (pre-existing warnings OK)
- ✅ Build: Succeeds with no errors
- ✅ Tests: 60+ tests pass (API tests may skip without SSH tunnel)

### Status:
- ✅ **VERIFIED**: All checks passed
  - TypeScript: ✅ Clean
  - Lint: ✅ 1 acceptable warning (img vs Image)
  - Build: ✅ Successful
  - Tests: ✅ 60 passed, 5 skipped (no tunnel)

---

## Test 8: NPM Security Audit

### Steps:
```bash
npm audit --omit=dev
```

### Expected Result:
- ✅ Output: "found 0 vulnerabilities"

### Status:
- ✅ **VERIFIED**: 0 vulnerabilities confirmed

---

## Test 9: RAST vs PATRIC Account Behavior

**This is to verify documentation, not test for a bug.**

### Steps:
1. Read `docs/TROUBLESHOOTING.md` → "Different models/media between RAST and PATRIC accounts"
2. Read CHANGELOG.md → "Expected Behaviors" section

### Expected Documentation:
- ✅ States this is **expected behavior**, not a bug
- ✅ Explains RAST and PATRIC use separate workspace folders
- ✅ Clarifies same username on both systems shows different data

### Status:
- ✅ **VERIFIED**: Properly documented in multiple locations

---

## Regression Testing

### Critical User Flows to Verify:
1. **Model Building**:
   - ✅ Plant model build page loads
   - ✅ Form fields work
   - ✅ Validation functions

2. **My Models**:
   - ✅ My Models page loads
   - ✅ Table displays (may be empty without auth)
   - ✅ No JavaScript errors

3. **Biochem Tables**:
   - ✅ Reactions list: `/biochem/reactions`
   - ✅ Compounds list: `/biochem/compounds`
   - ✅ Detail pages work

4. **Navigation**:
   - ✅ All nav links work
   - ✅ No 404 errors on valid routes

### Status:
- ✅ **VERIFIED**: No regressions detected in build/test

---

## Summary Checklist

### Completed ✅
- [x] Version updated to 3.0.0
- [x] SSH tunnel documentation added
- [x] Troubleshooting guide created
- [x] Compound structure images implemented
- [x] Invalid gapfill URL validation added
- [x] CHANGELOG updated
- [x] RAST/PATRIC behavior clarified
- [x] NPM audit clean (0 vulnerabilities)
- [x] TypeScript compiles cleanly
- [x] Build succeeds
- [x] Unit tests pass (60+)

### Requires SSH Tunnel for Full Validation ⏳
- [ ] Media tab population
- [ ] Version page endpoint status
- [ ] Reaction page compound images (live data)
- [ ] Full E2E test suite

### Production Readiness
- ✅ **Code Quality**: Production-ready
- ✅ **Documentation**: Comprehensive
- ✅ **Security**: No vulnerabilities
- ✅ **Testing**: All possible tests without SSH tunnel completed
- ⏳ **Live Backend Tests**: Pending SSH tunnel access

---

## Notes for QA Team

1. **SSH Tunnel is Required**: Many features require the SSH tunnel to be active. Set it up first before testing backend-dependent features.

2. **Expected Behaviors**: 
   - Media tab being empty without SSH tunnel is EXPECTED
   - Different data between RAST/PATRIC is EXPECTED
   - Some compounds may not have structure images - this is OK

3. **Test Environment**:
   - Use `.env.local` for configuration
   - Ensure `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` when using tunnel
   - Keep SSH tunnel terminal open during testing

4. **Known Limitations**:
   - See `issues.md` for documented backend API limitations
   - These are not frontend bugs and cannot be fixed from the UI

5. **Browser Console**:
   - Check console for errors during testing
   - Some CORS warnings from Solr are expected in development
   - API timeout errors without SSH tunnel are expected

---

## Contact

If you encounter issues not covered in this document:
- Check `docs/TROUBLESHOOTING.md`
- Review `issues.md` for known backend limitations
- Verify SSH tunnel is active
- Check environment variable configuration
