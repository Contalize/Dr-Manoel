## 2024-05-18 - Audit Log Auth State Race Condition
 **Vulnerability:** Audit logs were falling back to "system" and "anonymous" because `auth.currentUser` was accessed before Firebase Auth initialization was complete.
 **Learning:** Firebase Auth requires waiting for the auth state to be ready before accessing `currentUser`, otherwise it may be `null` initially. This compromised the integrity of the audit trail required for LGPD compliance.
 **Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` on the client.