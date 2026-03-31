## 2024-02-14 - Fix Auth State Race Condition in Audit Logging
**Vulnerability:** Audit logs (`logAction`) were directly using `auth.currentUser?.uid`, which returns null immediately on page load before Firebase Auth fully resolves, causing missing user identities in critical LGPD/ANVISA audit logs.
**Learning:** Firebase Auth state is asynchronous and initially null on client load. Using it directly without `onAuthStateChanged` is a race condition.
**Prevention:** Always wrap `onAuthStateChanged` in a Promise to securely resolve the current user state before accessing their UID during rapid client mutations, or use server-side session checks.
