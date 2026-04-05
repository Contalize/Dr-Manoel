## 2024-05-14 - Missing userId in Document Creation
**Vulnerability:** Newly created patient documents in `src/app/patients/page.tsx` were missing the `userId` field, which is required by Firestore rules for row-level access control.
**Learning:** Document creation components failed to enforce the data ownership constraints dictated by the security architecture for LGPD compliance.
**Prevention:** Always attach `userId: auth.currentUser.uid` when calling `addDoc` for entities that belong to the user, and use `await auth.authStateReady()` to prevent race conditions during auth resolution.
