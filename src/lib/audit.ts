
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Registra uma ação sensível na trilha de auditoria para conformidade LGPD e RDC/ANVISA.
 * Assegura que cada interação com dados de saúde seja rastreada.
 */
export async function logAction(action: string, patientId: string, metadata: any = {}) {
  try {
    // 🛡️ Sentinel: Await auth state to prevent race conditions attributing actions to "system"
    await auth.authStateReady();
    const user = auth.currentUser;

    // Fallbacks only for extreme cases, otherwise it uses the authenticated user context
    const userId = user?.uid || "system";
    const userName = user?.email || "anonymous";

    // Não utilizamos await para não bloquear a UI, seguindo as diretrizes de mutação rápida
    addDoc(collection(db, "audit_logs"), {
      userId,
      userName,
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
