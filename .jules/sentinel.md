## 2025-03-09 - Hardcoded Firebase Configuration Secrets
**Vulnerability:** Firebase initialization object in `src/firebase/config.ts` hardcoded sensitive information including `apiKey` and `appId`.
**Learning:** Hardcoded credentials expose our infrastructure to unauthorized usage and possible attack vectors. It's an easy mistake when pasting configuration from the Firebase console.
**Prevention:** Always rely on `process.env.NEXT_PUBLIC_FIREBASE_*` to inject these configurations at build or runtime. Keep a `.env.example` file to show required environment variables without exposing their actual values. Ensure `.env.local` is strictly excluded from version control via `.gitignore`.
