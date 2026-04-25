
import { db } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getCurrentUser } from "@/lib/auth-utils";

/**
 * Registra uma ação sensível na trilha de auditoria para conformidade LGPD e RDC/ANVISA.
 * Assegura que cada interação com dados de saúde seja rastreada.
 */
export async function logAction(action: string, patientId: string, metadata: any = {}) {
  try {
    // SECURITY: Use getCurrentUser to resolve race condition where currentUser is null
    // immediately on load. Ensure user exists before logging to avoid non-repudiation issues.
    const user = await getCurrentUser();

    if (!user) {
      console.error("Tentativa de ação de auditoria sem usuário autenticado. Ação negada.");
      return;
    }

    // Não utilizamos await para não bloquear a UI, seguindo as diretrizes de mutação rápida
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
