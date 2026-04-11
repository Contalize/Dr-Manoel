## 2024-04-11 - Race Condition in Firebase Client Auth State
 **Vulnerability:** Audit logs were sometimes attributed to the "system" user due to race conditions when accessing `auth.currentUser` before the auth state was fully initialized.
 **Learning:** Firebase v9+ requires `await auth.authStateReady()` on the client to securely resolve the current user state, preventing race conditions.
 **Prevention:** Always await `auth.authStateReady()` and explicitly verify `auth.currentUser` exists before accessing its properties when creating logs or documents that require LGPD-compliant user attribution.
