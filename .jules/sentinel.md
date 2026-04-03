## 2024-04-03 - Auth State Race Condition in Audit Logging
**Vulnerability:** Audit logs were using `auth.currentUser` synchronously before auth state was guaranteed to be initialized, leading to logs being improperly attributed to 'system'/'anonymous'.
**Learning:** Firebase's `auth.currentUser` can be null immediately on page load before the auth state is resolved, creating a race condition for rapid actions.
**Prevention:** Always `await auth.authStateReady()` before accessing user properties for critical operations like audit logging or creating documents that require a `userId`.
