
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Registra uma ação sensível na trilha de auditoria para conformidade LGPD e RDC/ANVISA.
 * Assegura que cada interação com dados de saúde seja rastreada.
 */
export async function logAction(action: string, patientId: string, metadata: any = {}) {
  try {
    // SECURITY: Await auth state to prevent race conditions attributing actions to "system"
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      console.warn(`[Security] Attempted to log action '${action}' without authenticated user. Action dropped.`);
      return;
    }

    // Não utilizamos await na escrita para não bloquear a UI
    addDoc(collection(db, "audit_logs"), {
      userId: user.uid,
      userName: user.email || "anonymous",
      action,
      patientId,
      timestamp: serverTimestamp(),
      metadata: {
        ...metadata,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      }
    });
  } catch (error) {
    // Erros de log de auditoria são tratados silenciosamente para não interromper o fluxo clínico, 
    // mas devem ser monitorados em logs de sistema.
    console.error("Falha ao registrar log de auditoria:", error);
  }
}
