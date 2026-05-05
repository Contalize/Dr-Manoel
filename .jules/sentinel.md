## 2024-05-24 - [Auth State Race Condition in Audit Logging]
**Vulnerability:** Audit logs were being recorded with a fallback `userId` of "system" and `userName` of "anonymous" if `auth.currentUser` evaluated to `null`. Because Firebase Auth initializes asynchronously, `auth.currentUser` is often `null` immediately on page load, even if the user is authenticated.
**Learning:** Accessing `auth.currentUser` directly without awaiting initialization creates a race condition that compromises non-repudiation and breaks LGPD compliance, as sensitive audit trail events could be incorrectly logged without an authenticated user context.
**Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` in client-side code where non-repudiation or strict user attribution is required. Additionally, explicitly check that the user object exists before proceeding with sensitive operations like audit logging.

## 2025-02-23 - [Insecure Random Number Generation for IDs]
**Vulnerability:** Found `Math.random().toString(36).substr(2, 9)` being used to generate unique `id_instancia` identifiers in `src/app/planner/page.tsx`. `Math.random()` is not cryptographically secure and relies on a PRNG (Pseudo-Random Number Generator) with predictable outputs, which could lead to ID collisions or predictability, albeit the risk is moderate in frontend state, but violates security best practices.
**Learning:** It existed likely because it is a common quick pattern for generating temporary random strings in JavaScript when a full UUID library wasn't considered necessary or to save bundle size, without considering the cryptographic weakness of `Math.random()`.
**Prevention:** Always use `crypto.randomUUID()` to generate unique identifiers in the frontend, which provides a cryptographically secure, collision-free UUIDv4, and is natively supported in modern browsers. `Math.random()` should be restricted to purely visual/non-security randomization.

## 2024-05-24 - [Hardcoded JWT Secret in Auth Module]
**Vulnerability:** A hardcoded fallback JWT secret (`process.env.JWT_SECRET || 'super-secret'`) was found in both `apps/api/src/auth/auth.module.ts` and `apps/api/src/auth/jwt.strategy.ts`.
**Learning:** Developers frequently use fallback secrets during local development to bypass environment variable configuration, but these often leak into production environments, severely compromising authentication mechanisms and allowing token forging.
**Prevention:** Never use hardcoded fallback secrets for cryptographic functions or JWT signing. Always fail-fast by explicitly checking and throwing an initialization error (`throw new Error(...)`) if required security environment variables like `JWT_SECRET` are missing at runtime.
