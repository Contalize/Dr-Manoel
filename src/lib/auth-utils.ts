import { auth } from "@/firebase/config";

/**
 * Securely resolves the current authenticated user.
 * Waits for the auth state to be ready to prevent race conditions
 * on initial load before accessing auth.currentUser.
 */
export async function getCurrentUser() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuário não autenticado");
  }
  return user;
 * Secures user retrieval by awaiting Firebase Auth initialization.
 * Prevents race conditions where `auth.currentUser` is incorrectly evaluated as null
 * on initial page load, ensuring proper LGPD user attribution and access rules.
 */
export async function getCurrentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}
