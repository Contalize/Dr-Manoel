## 2024-05-24 - [Auth State Race Condition in Audit Logging]
**Vulnerability:** Audit logs were being recorded with a fallback `userId` of "system" and `userName` of "anonymous" if `auth.currentUser` evaluated to `null`. Because Firebase Auth initializes asynchronously, `auth.currentUser` is often `null` immediately on page load, even if the user is authenticated.
**Learning:** Accessing `auth.currentUser` directly without awaiting initialization creates a race condition that compromises non-repudiation and breaks LGPD compliance, as sensitive audit trail events could be incorrectly logged without an authenticated user context.
**Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` in client-side code where non-repudiation or strict user attribution is required. Additionally, explicitly check that the user object exists before proceeding with sensitive operations like audit logging.

## 2024-05-24 - [Missing LGPD Row-Level Identifiers in Firestore Documents]
**Vulnerability:** Newly created records in `consultations` and `evolutions` were missing the `userId` field, violating the Firestore security rules intended to enforce LGPD row-level access controls.
**Learning:** Security rules that depend on document fields like `userId` will inadvertently deny access (or fail open if rules are overly permissive) if the application logic forgets to append the identifier to the document payload upon creation.
**Prevention:** Always inject `userId: user?.uid` when writing sensitive user-associated documents to Firestore. Use a utility like `getCurrentUser()` to ensure the user identity is securely resolved without race conditions before inserting the identifier.
