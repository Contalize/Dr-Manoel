
import { db, auth } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

// Função utilitária para obter o usuário autenticado com segurança
// Evita race conditions verificando o estado real via onAuthStateChanged
function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, () => {
      unsubscribe();
      resolve(null);
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
