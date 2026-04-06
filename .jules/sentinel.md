## 2024-06-03 - Auth State Race Condition Leaking System Identity

**Vulnerability:** Firebase `auth.currentUser` was accessed synchronously before the auth state had time to initialize. This caused new patient records to miss the `userId` field required for row-level access control, and audit logs incorrectly recorded "system" as the user identity instead of the actual user's UID and email.

**Learning:** This codebase relies on `auth.currentUser` directly in the UI and services. Because Firebase auth initializes asynchronously, `auth.currentUser` will be `null` on the first few ticks even if a user session is active. Synchronous reads cause a race condition.

**Prevention:** Before accessing `auth.currentUser` to perform sensitive mutations (like document creation or audit logging), always `await auth.authStateReady()` to guarantee the user's session is fully restored and correctly resolved. Additionally, ensure strict `if (!currentUser)` checks before allowing the operation.
