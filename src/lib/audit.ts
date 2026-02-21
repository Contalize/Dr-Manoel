
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Registra uma ação sensível na trilha de auditoria para conformidade LGPD.
 */
export async function logAction(action: string, patientId: string, metadata: any = {}) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "audit_logs"), {
      userId: user?.uid || "system",
      userName: user?.email || "anonymous",
      action,
      patientId,
      timestamp: serverTimestamp(),
      metadata
    });
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}
