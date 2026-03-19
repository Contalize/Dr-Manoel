## 2024-05-24 - API Key Exposure in Client-Side Configuration
**Vulnerability:** Firebase `apiKey` and `projectId` are hardcoded in `src/firebase/config.ts`.
**Learning:** These keys are public identifiers for Firebase services and are designed to be exposed to the client. Securing them provides no real security benefit ("security theater").
**Prevention:** Follow Firebase best practices; do not obscure public identifiers. Focus on robust backend security rules instead.

## 2024-05-24 - Missing Authorization checks on writes
**Vulnerability:** Documents across collections (e.g., appointments, transactions, prescriptions) lack the `userId` field matching the authenticated user's UID (`auth.currentUser?.uid`), which is required for enforcing strict row-level access for LGPD compliance. Firestore rules are currently permissive to compensate.
**Learning:** For SaaS multitenancy or secure access, each document must uniquely link to its owner.
**Prevention:** Ensure all `addDoc` calls include `userId: auth.currentUser?.uid` where applicable so Firestore rules can enforce it.
