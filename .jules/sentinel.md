## 2024-05-18 - [CRITICAL] Hardcoded Firebase Credentials in Configuration

**Vulnerability:** The Firebase configuration in `src/firebase/config.ts` previously contained hardcoded credentials, including the `apiKey` and other project identifiers, effectively exposing them to source control and making them easily accessible.
**Learning:** Hardcoding credentials in source code is a critical vulnerability that violates standard security practices. The `apiKey` (e.g., `AIzaSy...`) should not be embedded directly in the frontend bundle. Even though Firebase client-side keys are designed to be public, relying on hardcoded keys is bad practice and they should be passed through environment variables, which can also easily adapt to different environments (development, staging, production).
**Prevention:**
- Use environment variables to load configuration dynamically at build or runtime.
- For Next.js projects, environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Thus, Firebase keys should be defined in a `.env.local` or `.env` file and accessed via `process.env.NEXT_PUBLIC_FIREBASE_*`.
- Provide a `.env.example` file to document the expected environment variables without revealing sensitive values.
- In automated pipelines, rely on secure secret management systems rather than committing secrets.
