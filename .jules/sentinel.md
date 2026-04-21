## 2024-05-24 - [Insecure Local State Key Generation]
**Vulnerability:** Found `Math.random().toString(36).substr(2, 9)` being used to generate unique IDs (`id_instancia`) for selected therapies in the frontend.
**Learning:** `Math.random()` is not cryptographically secure and can lead to collisions, particularly if multiple instances are created in tight loops or if the PRNG state is predictable. While used for local state keys here, it's a poor practice for ID generation.
**Prevention:** Always use `crypto.randomUUID()` for generating unique object identifiers or state keys to ensure cryptographically secure, collision-free values. `Math.random()` should be restricted to purely visual/non-critical randomization.
## 2024-05-24 - Missing userId in created documents
**Vulnerability:** Newly created Firestore documents are not appending the user's `userId`.
**Learning:** This is required by the Firestore rules for proper authorization scoping and access limits per LGPD compliance. But developers often forget to include it on new document creation.
**Prevention:** Make sure `userId` is added to data being saved via `addDoc()` and `setDoc()`.

## 2024-05-24 - Firebase Auth State Race Condition
**Vulnerability:** Audit logs were occasionally misattributing sensitive actions to a "system" user due to `auth.currentUser` being evaluated before auth state initialization.
**Learning:** In Firebase v9+, accessing `auth.currentUser` directly on client load can return `null` momentarily even for authenticated users, creating a race condition.
**Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` when performing sensitive operations that require attribution.
