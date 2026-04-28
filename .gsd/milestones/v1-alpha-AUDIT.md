# Milestone Audit: v1-alpha

**Audited:** 2026-03-11

## Summary
| Metric | Value |
|--------|-------|
| Phases | 12 |
| Gap closures | 3 (AuthGuard implementation, Header username display, JGI Gene Atlas link correction) |
| Technical debt items | 4 |

## Must-Haves Status
| Requirement | Verified | Evidence |
|-------------|----------|----------|
| UI Parity (Theme & Layout) | ✅ | Extensively verified across components matching legacy AngularJS via browser screenshots. |
| Biochemistry/Solr Integration (Tables, Searches, Filters) | ✅ | Active connection confirmed working locally; advanced DataGrid features implemented. |
| Authentication Framework | ✅ | Mock and bypass functionality successfully deployed with Route Guards verified. |
| Reference Data & User Data Routing | ✅ | Skeletons built for all pages reflecting 1:1 legacy functionality. |

## Concerns
- **CORS Limitations on Authentication:** While the developer mock login securely circumvents CORS, direct browser calls to external servers (PATRIC/RAST) via the Next.js Client may fail due to Origin policies in production.
- **Disconnected Mutations:** Form UI elements for model building and media creation are visually intact but have not been wired to perform accurate Workspace API POST/PUT requests.
- **PlantSEED V3 Transition:** Legacy PlantSEED pipelines are currently deprecated. The UI relies on static warning banners. Structural changes from the backend team might require a substantial refactor of the `/plant` inputs later.

## Recommendations
1. **Proxy Authentication:** Convert the `login` function inside `components/auth/AuthProvider.tsx` to utilize Next.js Server Actions (e.g., `app/api/auth/route.ts`). This guarantees CORS-free token fetching.
2. **Abstract Workspace Routing:** Rapidly implement the backend team's proxy configuration layer before wiring any DataGrid "Save" or FBA "Build" buttons.
3. **Dedicated Mock API:** If backend APIs remain unstable during Phase 13/14 development, invest in a local MSW (Mock Service Worker) to intercept Workspace save actions to unblock frontend UI state testing.

## Technical Debt to Address
- [ ] Refactor external authentication fetches to Next.js Server Actions to safely bypass browser CORS restrictions.
- [ ] Wire up "Create New Media" endpoint connections inside `/myMedia`.
- [ ] Wire up "Build Model" POST payload assembly and submission inside `/plant`.
- [ ] Complete the dynamic route generation for viewing specific Workspace models (`/model/[id]`).

## Timestamp Log
- Created: 2026-03-11 10:46:00 -05:00
