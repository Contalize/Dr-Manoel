## 2024-05-24 - Missing userId in created documents
**Vulnerability:** Newly created Firestore documents are not appending the user's `userId`.
**Learning:** This is required by the Firestore rules for proper authorization scoping and access limits per LGPD compliance. But developers often forget to include it on new document creation.
**Prevention:** Make sure `userId` is added to data being saved via `addDoc()` and `setDoc()`.

## 2024-05-24 - Firebase Auth State Race Condition
**Vulnerability:** Audit logs were occasionally misattributing sensitive actions to a "system" user due to `auth.currentUser` being evaluated before auth state initialization.
**Learning:** In Firebase v9+, accessing `auth.currentUser` directly on client load can return `null` momentarily even for authenticated users, creating a race condition.
**Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` when performing sensitive operations that require attribution.
