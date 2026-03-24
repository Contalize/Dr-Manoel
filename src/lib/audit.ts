
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

/**
 * Resolve the current user securely, avoiding race conditions
 * where auth state is not yet hydrated when rapid UI mutations occur.
 */
function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Registra uma ação sensível na trilha de auditoria para conformidade LGPD e RDC/ANVISA.
 * Assegura que cada interação com dados de saúde seja rastreada.
 */
export async function logAction(action: string, patientId: string, metadata: any = {}) {
  try {
    const user = await getCurrentUser();

    // Log sensível de auditoria: O await anterior garante que temos a identidade real
    // do usuário antes de submeter o log, prevenindo atribuições incorretas à "system".
    // A inserção do documento (addDoc) em si não utiliza await para não bloquear a UI
    // com a requisição de rede.
    addDoc(collection(db, "audit_logs"), {
      userId: user?.uid || "system",
      userName: user?.email || "anonymous",
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
