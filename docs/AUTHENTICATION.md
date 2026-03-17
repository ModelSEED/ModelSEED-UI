# Authentication & Security Strategy (`AUTHENTICATION.md`)

> **🤖 AI Agent Quick-Start**
> All downstream API calls to Workspace or `modelseed-api` **require** the raw PATRIC token in the `Authorization` header. Do not prepend `Bearer `. Always use `getStoredAuth()` from `lib/api/auth.ts` to access the token outside of React lifecycle methods.

ModelSEED-UI authenticates against **RAST** and **PATRIC/BV-BRC** services. This document outlines how users are logged in, how tokens are securely managed, and how private routes are guarded.

---

## 🛡️ The Global Auth Provider

**Location:** `components/auth/AuthProvider.tsx`

The application enforces auth state via a React Context. It provides:
- `isAuthenticated` (boolean)
- `user` (string ID)
- `token` (raw authorization string)
- `login()` and `logout()` mutators.

### Storage & Persistence
Tokens are stored **exclusively in `localStorage['auth']`**. We do not use cookies.
The `AuthProvider` listens to cross-tab `storage` events, ensuring that if a user logs out in Tab A, they are immediately stripped of credentials in Tab B.

---

## 🚪 Sign-In Flow

Low-level communication lives in `lib/api/auth.ts`.

1. **User Action:** The user submits credentials via the `SignInModal.tsx` specifying either PATRIC or RAST.
2. **Backend Authentication:**
   - **PATRIC:** `POST https://user.patricbrc.org/authenticate`
   - **RAST:** `POST https://p3.theseed.org/Sessions/Login`
   *Note: Both require `application/x-www-form-urlencoded` payloads.*
3. **Token Resolution:** The response is destructured into an `AuthResult`:
   ```ts
   interface AuthResult {
     user_id: string;
     token: string; // The exact string to pass in network headers
     method: 'PATRIC' | 'RAST';
   }
   ```
4. **Hydration:** `persistAuth()` fires, writing to LocalStorage, and triggering the React Context to re-render the app in an authenticated state.

---

## 💂 Protecting Routes

We enforce privacy using the `<AuthGuard>` wrapper. 

**Location:** `components/auth/AuthGuard.tsx`

If an entire page (like `/my-models` or `/my-jobs`) requires authentication, wrap the page's output:

```tsx
export default function ProtectedPage() {
    return (
        <AuthGuard>
            <MySecretDataComponent />
        </AuthGuard>
    );
}
```

**Behavior:**
- Unauthenticated users will see an "Authentication Required" prompt.
- It prevents React Query from firing unauthorized `workspaceGet()` requests and returning 401/403 errors.

### Component-Level Guarding
If a page is public but has private features (e.g., a "Save to My Workspace" button on a public biochemistry page), use the hook:
```tsx
const { isAuthenticated } = useAuth();
<Button disabled={!isAuthenticated}>Save</Button>
```

---

## 📡 Sending Tokens to Backends

When writing new `lib/api/` abstractions, retrieve the token globally and attach it:
```typescript
import { getStoredAuth } from './auth';

export async function fetchMyPrivateData() {
    const auth = getStoredAuth();
    if (!auth) throw new Error("Unauthorized");

    const res = await fetch("...", {
        headers: {
            "Authorization": auth.token // DO NOT prepend 'Bearer'
        }
    });
}
```
