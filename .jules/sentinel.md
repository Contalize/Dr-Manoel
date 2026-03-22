## 2024-03-22 - Authentication Race Condition in Audit Logging
**Vulnerability:** Audit logs were being recorded with 'system'/'anonymous' as the user because `auth.currentUser` was used synchronously and could be null during the early page load before Firebase Auth initialized.
**Learning:** `auth.currentUser` is synchronous and does not wait for the authentication state to resolve, leading to race conditions where the user appears unauthenticated despite having a valid session.
**Prevention:** Use a Promise wrapper around `onAuthStateChanged` to securely resolve the user state before performing rapid UI mutations or generating audit logs.
