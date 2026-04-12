## 2025-04-12 - Missing row-level authentication tracking in patient creation
**Vulnerability:** Newly created patient documents lacked a `userId` field and could suffer from uninitialized `auth.currentUser` objects, preventing strict row-level access enforcement required for LGPD compliance.
**Learning:** The application created critical documents without resolving authentication state first, risking race conditions and bypassing ownership-based security rules.
**Prevention:** Always use `await auth.authStateReady()` and explicitly validate `auth.currentUser` existence before appending `userId` to newly created user documents.
