## 2024-03-28 - [Audit Logging] Fix Firebase Auth Race Condition
**Vulnerability:** Audit logs were incorrectly recording the user as "system" or "anonymous" because `auth.currentUser` was accessed synchronously before the Firebase Auth SDK had fully initialized.
**Learning:** `auth.currentUser` is null initially. We must await `onAuthStateChanged` to accurately resolve the user identity during rapid UI mutations or page loads.
**Prevention:** Always use a Promise wrapper around `onAuthStateChanged` when reading the current user for sensitive operations like audit logging or row-level access control.
