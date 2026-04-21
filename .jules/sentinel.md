## 2024-05-18 - Audit Log Auth State Race Condition
 **Vulnerability:** Audit logs were falling back to "system" and "anonymous" because `auth.currentUser` was accessed before Firebase Auth initialization was complete.
 **Learning:** Firebase Auth requires waiting for the auth state to be ready before accessing `currentUser`, otherwise it may be `null` initially. This compromised the integrity of the audit trail required for LGPD compliance.
 **Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` on the client.
## 2025-02-23 - [Insecure Random Number Generation for IDs]
**Vulnerability:** Found `Math.random().toString(36).substr(2, 9)` being used to generate unique `id_instancia` identifiers in `src/app/planner/page.tsx`. `Math.random()` is not cryptographically secure and relies on a PRNG (Pseudo-Random Number Generator) with predictable outputs, which could lead to ID collisions or predictability, albeit the risk is moderate in frontend state, but violates security best practices.
**Learning:** It existed likely because it is a common quick pattern for generating temporary random strings in JavaScript when a full UUID library wasn't considered necessary or to save bundle size, without considering the cryptographic weakness of `Math.random()`.
**Prevention:** Always use `crypto.randomUUID()` to generate unique identifiers in the frontend, which provides a cryptographically secure, collision-free UUIDv4, and is natively supported in modern browsers. `Math.random()` should be restricted to purely visual/non-security randomization.
