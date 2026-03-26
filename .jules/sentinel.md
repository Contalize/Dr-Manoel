## 2024-03-26 - Prevent Authentication Race Conditions in Audit Logging
**Vulnerability:** Audit logs were using `auth.currentUser` synchronously, which evaluates to `null` during the initial Firebase auth state initialization. This caused legitimate user actions to be logged as "system" and assigned the wrong `userId`.
**Learning:** In Firebase, `auth.currentUser` is not immediately available on page load. Synchronous reads for critical operations like security auditing or authorization can lead to race conditions and attribute actions to the wrong entity, undermining LGPD compliance.
**Prevention:** Always use a Promise wrapper around `onAuthStateChanged` to securely resolve the authenticated user before performing critical operations or rapid UI mutations that rely on user identity.
