import { functions } from "@/firebase/config";
import { httpsCallable } from "firebase/functions";
import type { UserRole } from "@/contexts/AuthContext";

export interface ManagedUser {
  uid: string;
  role: UserRole | null;
  nome: string;
  email: string | null;
}

export async function claimFirstAdmin() {
  const call = httpsCallable(functions, "claimFirstAdmin");
  await call();
}

export async function listUsersForAdmin(): Promise<ManagedUser[]> {
  const call = httpsCallable<unknown, { users: ManagedUser[] }>(functions, "listUsersForAdmin");
  const result = await call();
  return result.data.users;
}

export async function setUserRole(uid: string, role: UserRole) {
  const call = httpsCallable(functions, "setUserRole");
  await call({ uid, role });
}
