
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

/**
 * Obtém o usuário de forma segura, aguardando a inicialização do Firebase Auth.
 * Previne race conditions onde auth.currentUser é null temporariamente no carregamento da página.
 */
async function getSecureUser(): Promise<User | null> {
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
    // SECURITY FIX: Prevent race condition logging actions as anonymous/system
    // Wait for the auth state to resolve to securely get the user ID
    const user = await getSecureUser();

    // Não utilizamos await no addDoc para não bloquear a UI, seguindo as diretrizes de mutação rápida
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
