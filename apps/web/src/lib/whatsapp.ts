import { functions } from "@/firebase/config";
import { httpsCallable } from "firebase/functions";

interface WhatsappCredentials {
  instanceId: string;
  token: string;
}

/**
 * Envia uma mensagem de WhatsApp. Sem `credentials`, chama sendWhatsappMessage
 * (a Cloud Function lê o token salvo direto pelo Admin SDK — nunca trafega
 * pelo cliente). Passe `credentials` só para testar valores do formulário de
 * Configurações ainda não salvos (usa sendWhatsappTest nesse caso).
 */
export async function sendWhatsappMessage(
  phone: string,
  message: string,
  credentials?: WhatsappCredentials
) {
  if (credentials) {
    const send = httpsCallable(functions, "sendWhatsappTest");
    return send({ phone, message, instanceId: credentials.instanceId, token: credentials.token });
  }

  const send = httpsCallable(functions, "sendWhatsappMessage");
  return send({ phone, message });
}
