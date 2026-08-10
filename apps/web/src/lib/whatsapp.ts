import { db, functions } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

interface WhatsappCredentials {
  instanceId: string;
  token: string;
}

/**
 * Envia uma mensagem via Cloud Function (sendWhatsappTest). Por padrão busca as
 * credenciais salvas em clinic_settings/whatsapp; passe `credentials` para usar
 * valores explícitos (ex: testar um formulário ainda não salvo em Configurações).
 */
export async function sendWhatsappMessage(
  phone: string,
  message: string,
  credentials?: WhatsappCredentials
) {
  let creds = credentials;
  if (!creds) {
    const waDoc = await getDoc(doc(db, "clinic_settings", "whatsapp"));
    if (!waDoc.exists()) {
      throw new Error("WhatsApp não configurado. Acesse Configurações → WhatsApp.");
    }
    creds = waDoc.data() as WhatsappCredentials;
  }

  const send = httpsCallable(functions, "sendWhatsappTest");
  return send({ phone, message, instanceId: creds.instanceId, token: creds.token });
}
