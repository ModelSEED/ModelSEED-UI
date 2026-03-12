# Authentication & Security Strategy (`AUTHENTICATION.md`)

ModelSEED‑UI authenticates against **RAST** and **PATRIC/BV‑BRC** services, then reuses the returned token for Workspace, ProbModelSEED, and `modelseed-api` calls. This document outlines how users are logged in, how tokens are stored, and how pages are protected.

---

## The Global Auth Provider (`AuthProvider.tsx`)

Location: `components/auth/AuthProvider.tsx`

- Wraps the app with a React Context that exposes:
  - `isAuthenticated`, `user`, `token`, `method` (`'RAST' | 'PATRIC'`), `login()`, and `logout()`.
- On mount, it:
  - Reads the last `AuthResult` from `localStorage['auth']`.
  - Listens for `storage` events so logout in one tab logs out all tabs.
- Tokens are stored **only** in localStorage (no cookies) and sent in the `Authorization` header for all downstream API calls.

### Sample Usage in a Component

```tsx
import { useAuth } from '@/components/auth/AuthProvider';

export default function MyProtectedComponent() {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <p>Please log in.</p>;

    return <p>Welcome, {user}!</p>;
}
```

---

## Sign‑In Flow (RAST & PATRIC)

Low‑level calls live in `lib/api/auth.ts`:

1. **User input**  
   - On the home page or in `SignInModal.tsx`, the user selects **RAST** or **PATRIC** and enters credentials.

2. **Backend login**
   - PATRIC: `POST https://user.patricbrc.org/authenticate` with `application/x-www-form-urlencoded`.  
   - RAST: `POST https://p3.theseed.org/Sessions/Login` with `application/x-www-form-urlencoded`.

3. **Token handling**
   - Both flows resolve to an `AuthResult`:
     ```ts
     interface AuthResult {
       user_id: string;
       token: string;     // raw PATRIC/RAST token
       method: 'PATRIC' | 'RAST';
     }
     ```
   - `persistAuth()` serializes this into `localStorage['auth']`.

4. **Usage downstream**
   - `lib/api/workspace.ts` and `lib/api/modelseed.ts` read the stored token and send:
     - `Authorization: <token>` for:
       - `https://p3.theseed.org/services/Workspace`
       - `https://p3.theseed.org/services/ProbModelSEED`
       - `${MODELSEED_API_URL}/api/*`

---

## Protecting Pages and Routes

We use **page‑level guards** plus dedicated components:

### `AuthGuard` component

- Location: `components/auth/AuthGuard.tsx`.
- Wraps protected pages such as:
  - `app/(user-data)/my-models/page.tsx`
  - `app/(user-data)/myMedia/page.tsx`
- Behavior:
  - If `isAuthenticated === false`, renders a sign‑in prompt or redirect.
  - If `true`, renders children normally.

### Conditional Logic in Pages

- Pages can also branch on `isAuthenticated` to:
  - Short‑circuit API calls (`enabled: isAuthenticated` in `useQuery`).
  - Swap full tables for “Please sign in to view your data” copy.

---

## Development & Testing Notes

- The **developer bypass** in `lib/api/auth.ts` lets you log in with `developer/developer` to get a fixed token without hitting remote services; use this only in local environments.
- When integrating new backend services (e.g. additional `modelseed-api` endpoints), always:
  - Read the token via `getStoredAuth()` or `useAuth()`.
  - Send it in the `Authorization` header as‑is (no extra `Bearer ` prefix unless the backend explicitly requires it).

---

*Refer to `WORKSPACE.md` and `ARCHITECTURE.md` for how auth tokens flow into Workspace and `modelseed-api` calls.*
