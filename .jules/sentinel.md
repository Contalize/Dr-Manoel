## 2026-04-16 - [Missing userId in Patient Creation]
**Vulnerability:** New patient records were being created without a 'userId' field linking them to the authenticated creator.
**Learning:** This breaks strict row-level access rules needed for LGPD compliance. Using 'auth.currentUser?.uid' directly on the client can result in race conditions where the auth state isn't initialized yet.
**Prevention:** Always await 'auth.authStateReady()' to securely resolve the user and explicitly assign 'userId' to all new records during creation to allow for robust row-level security rules.
