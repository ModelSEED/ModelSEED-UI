# Authentication & Security Strategy (`AUTHENTICATION.md`)

The ModelSEED-UI is powered by the **KBase Authentication System**. This document outlines how users are logged in, how tokens are stored, and how pages are protected.

---

## 🏗️ The Global Auth Provider (`AuthProvider.tsx`)

Located at: `components/auth/AuthProvider.tsx`

We use a **Zustand store** wrapped in a **React Context Provider** to manage authentication globally. This pattern allows us to:
1.  **Initialize Once**: The root layout initializes the provider.
2.  **Persistent Session**: Logic checks for existing tokens in local storage on page load.
3.  **Global Access**: Any functional component can call `useAuth()` to get the current user and their token.

### 🧬 Sample Usage in a Component

```tsx
import { useAuth } from '@/components/auth/AuthProvider';

export default function MyProtectedComponent() {
    const { isAuthenticated, user, token } = useAuth();

    if (!isAuthenticated) return <p>Please log in.</p>;
    
    return <p>Welcome, {user}! Your token is: {token.substring(0, 5)}...</p>;
}
```

---

## 🌉 Sign-In Flow

ModelSEED-UI connects to a **Backend Proxy** or the **KBase Auth API** directly (see `lib/api/auth.ts`).

1.  **User Input**: User enters credentials through the `SignInModal.tsx`.
2.  **KBase Auth**: A request is sent to `https://kbase.us/services/auth/api/legacy/KBase/Sessions/Login`.
3.  **Token Processing**: On success, the backend returns a KBase session token and user metadata.
4.  **Local Storage**: The token is securely stored in the browser's local storage for session persistence across refreshes.

---

## 🛡️ Protecting Pages and Routes

We offer two primary ways to protect user data from unauthorized access:

### 🎒 Method 1: The `<RequireAuth>` Wrapper
Best for protecting specific components inside a page.
```tsx
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function MyPage() {
    return (
        <RequireAuth>
            <MySecretDataViewer />
        </RequireAuth>
    );
}
```

### 🛣️ Method 2: Conditional Navigation (Page-Level)
Best for preventing a user from even reaching a URL (e.g., `app/my-models/page.tsx`). We use a simple logic check in the page component to redirect or show a "Sign-in required" view.

---

## ⚡ Mock Authentication Mode (Development)
For local development where a real KBase session isn't required, the `AuthProvider` can be configured to use a **Mock User** for testing UI behaviors without a live network connection.

---
*Refer to `lib/api/auth.ts` for the low-level RPC calls.*
