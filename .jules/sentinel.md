## 2024-05-24 - [Auth State Race Condition in Audit Logging]
**Vulnerability:** Audit logs were being recorded with a fallback `userId` of "system" and `userName` of "anonymous" if `auth.currentUser` evaluated to `null`. Because Firebase Auth initializes asynchronously, `auth.currentUser` is often `null` immediately on page load, even if the user is authenticated.
**Learning:** Accessing `auth.currentUser` directly without awaiting initialization creates a race condition that compromises non-repudiation and breaks LGPD compliance, as sensitive audit trail events could be incorrectly logged without an authenticated user context.
**Prevention:** Always await `auth.authStateReady()` before accessing `auth.currentUser` in client-side code where non-repudiation or strict user attribution is required. Additionally, explicitly check that the user object exists before proceeding with sensitive operations like audit logging.

## 2025-02-23 - [Insecure Random Number Generation for IDs]
**Vulnerability:** Found `Math.random().toString(36).substr(2, 9)` being used to generate unique `id_instancia` identifiers in `src/app/planner/page.tsx`. `Math.random()` is not cryptographically secure and relies on a PRNG (Pseudo-Random Number Generator) with predictable outputs, which could lead to ID collisions or predictability, albeit the risk is moderate in frontend state, but violates security best practices.
**Learning:** It existed likely because it is a common quick pattern for generating temporary random strings in JavaScript when a full UUID library wasn't considered necessary or to save bundle size, without considering the cryptographic weakness of `Math.random()`.
**Prevention:** Always use `crypto.randomUUID()` to generate unique identifiers in the frontend, which provides a cryptographically secure, collision-free UUIDv4, and is natively supported in modern browsers. `Math.random()` should be restricted to purely visual/non-security randomization.

## 2025-05-28 - [Hardcoded JWT Secret Fallbacks]
**Vulnerability:** Found `process.env.JWT_SECRET || 'super-secret'` in `apps/api/src/auth/auth.module.ts` and `apps/api/src/auth/jwt.strategy.ts`. If `JWT_SECRET` is misconfigured or missing in production, the application silently falls back to a publicly known, hardcoded secret, allowing anyone to mint valid JWTs and bypass authentication completely.
**Learning:** Hardcoded cryptographic fallbacks are a critical anti-pattern because they mask configuration errors and fail silently into an insecure state rather than failing fast and visibly.
**Prevention:** Never use hardcoded fallback secrets for cryptographic functions or JWT signing. Always implement fail-fast mechanisms by explicitly checking and throwing an initialization error if required security environment variables are missing during startup.

## 2025-06-05 - [Overly Permissive CORS Configuration]
**Vulnerability:** The NestJS API used `app.enableCors()` with empty arguments, which defaults to allowing requests from any origin.
**Learning:** Default configurations for security features like CORS often prioritize ease of development over security, leading to overly permissive access if not explicitly constrained.
**Prevention:** Explicitly configure CORS within `app.enableCors()` by specifying allowed origins (e.g., using `process.env.FRONTEND_URL` with a localhost fallback), methods, and credentials, rather than relying on the overly permissive default empty arguments.
