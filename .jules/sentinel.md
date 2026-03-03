# Sentinel Security Journal

## 2024-05-24 - [CRITICAL] Hardcoded Secrets in Source Code
**Vulnerability:** Firebase credentials and configuration were hardcoded directly in `src/firebase/config.ts`.
**Learning:** Hardcoding credentials makes them susceptible to exposure through source control, exposing the application to potential abuse of Firebase resources if the code is ever made public or accessed by an unauthorized entity.
**Prevention:** Always use environment variables for sensitive credentials (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`) and manage these variables through `.env.local` or a CI/CD pipeline. Provide a `.env.example` file to document the required keys without exposing their actual values.