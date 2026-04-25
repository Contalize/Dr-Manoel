import { auth } from "@/firebase/config";

/**
 * Secures user retrieval by awaiting Firebase Auth initialization.
 * Prevents race conditions where `auth.currentUser` is incorrectly evaluated as null
 * on initial page load, ensuring proper LGPD user attribution and access rules.
 */
export async function getCurrentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}
