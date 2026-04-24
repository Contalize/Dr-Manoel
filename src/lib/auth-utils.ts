import { auth } from "@/firebase/config";

/**
 * Ensures we securely get the authenticated user.
 * Avoids race conditions by awaiting authStateReady.
 */
export async function getCurrentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}
