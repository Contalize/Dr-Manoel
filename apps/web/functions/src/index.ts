import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

const REGION = "southamerica-east1";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Números locais (DDD + número) têm 10-11 dígitos; com código do país (55)
  // já são 12-13. Checar só o prefixo "55" falha para DDDs que começam com
  // "55" (Rio Grande do Sul) — por isso o comprimento decide, não o prefixo.
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  return "55" + digits;
}

/**
 * Envia uma mensagem de texto via Z-API e retorna o payload de resposta.
 * Lança erro se a resposta não for OK — centraliza a lógica repetida entre
 * sendWhatsappReminders, sendWhatsappMessage e sendWhatsappTest.
 */
async function sendZapiText(
  instanceId: string,
  token: string,
  phone: string,
  message: string
): Promise<{ messageId?: string }> {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: formatPhone(phone), message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Z-API error: ${error}`);
  }

  return (await response.json()) as { messageId?: string };
}

// Data-alvo do lembrete, a partir de quantas horas de antecedência a clínica
// configurou em Configurações → WhatsApp (padrão: 24h / "amanhã").
function getTargetDateStr(hoursAhead: number): string {
  const target = new Date();
  target.setHours(target.getHours() + hoursAhead);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Dispara automaticamente todos os dias — envia lembretes de WhatsApp para os
 * agendamentos dentro da janela configurada em clinic_settings/whatsapp.
 * Substitui a antiga rota Next.js /api/reminders/run, que nunca era invocada
 * (o site é publicado como export estático no Firebase Hosting, sem servidor).
 */
export const sendWhatsappReminders = onSchedule(
  { schedule: "0 8 * * *", timeZone: "America/Sao_Paulo", region: REGION },
  async () => {
    const db = getFirestore();

    const waDoc = await db.collection("clinic_settings").doc("whatsapp").get();
    if (!waDoc.exists) {
      logger.info("WhatsApp não configurado (clinic_settings/whatsapp ausente). Nada a fazer.");
      return;
    }

    const { instanceId, token, enabled, reminderHoursBeforeAppointment } = waDoc.data() as {
      instanceId?: string;
      token?: string;
      enabled?: boolean;
      reminderHoursBeforeAppointment?: number;
    };

    if (!enabled || !instanceId || !token) {
      logger.info("Automação de lembretes desativada ou sem credenciais configuradas.");
      return;
    }

    const targetDateStr = getTargetDateStr(reminderHoursBeforeAppointment ?? 24);

    const appointmentsSnap = await db
      .collection("appointments")
      .where("date", "==", targetDateStr)
      .where("status", "in", ["Scheduled", "Confirmed"])
      .get();

    if (appointmentsSnap.empty) {
      logger.info(`Nenhum agendamento para ${targetDateStr}.`);
      return;
    }

    let sent = 0;
    let skipped = 0;

    for (const appointmentDoc of appointmentsSnap.docs) {
      const appointment = appointmentDoc.data();
      const { patientName, patientId, time, type } = appointment;

      let phone = "";
      if (patientId) {
        const patientDoc = await db.collection("patients").doc(patientId).get();
        if (patientDoc.exists) {
          phone = (patientDoc.data()?.phone as string) || "";
        }
      }

      if (!phone) {
        skipped++;
        logger.info(`SEM TELEFONE: ${patientName}`);
        continue;
      }

      if (appointment.reminderSent === true) {
        skipped++;
        logger.info(`JÁ ENVIADO: ${patientName}`);
        continue;
      }

      const [year, month, day] = targetDateStr.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      const message =
        `Olá, *${patientName}*! 👋\n\n` +
        `Lembramos do seu agendamento:\n\n` +
        `📅 *${formattedDate}*\n` +
        `⏰ *${time}*\n` +
        `🏥 *Dr. Manoel da Farmácia*\n` +
        `💊 *${type}*\n\n` +
        `Para confirmar ou reagendar, responda esta mensagem. 💚`;

      try {
        await sendZapiText(instanceId, token, phone, message);

        await appointmentDoc.ref.update({
          reminderSent: true,
          reminderSentAt: new Date().toISOString(),
        });

        await db.collection("audit_logs").add({
          action: "WHATSAPP_LEMBRETE_AUTOMATICO",
          targetId: appointmentDoc.id,
          details: { paciente: patientName, data: targetDateStr, horario: time },
          timestamp: new Date(),
          userId: "system",
        });

        sent++;
        logger.info(`ENVIADO: ${patientName} (${time})`);
      } catch (err) {
        skipped++;
        logger.error(`Falha ao enviar lembrete para ${patientName}:`, err);
      }
    }

    logger.info(`Lembretes concluídos para ${targetDateStr}: ${sent} enviados, ${skipped} pulados.`);
  }
);

/**
 * Callable usada para envios reais (mensagem manual a paciente, lembrete
 * manual de consulta). Lê as credenciais salvas direto pelo Admin SDK — o
 * token da Z-API nunca precisa trafegar pelo cliente para esse caso, ao
 * contrário de sendWhatsappTest, que testa credenciais ainda não salvas.
 */
export const sendWhatsappMessage = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const { phone, message } = (request.data || {}) as { phone?: string; message?: string };
  if (!phone || !message) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes: phone, message");
  }

  const waDoc = await getFirestore().collection("clinic_settings").doc("whatsapp").get();
  if (!waDoc.exists) {
    throw new HttpsError("failed-precondition", "WhatsApp não configurado. Acesse Configurações → WhatsApp.");
  }
  const { instanceId, token } = waDoc.data() as { instanceId?: string; token?: string };
  if (!instanceId || !token) {
    throw new HttpsError("failed-precondition", "WhatsApp não configurado. Acesse Configurações → WhatsApp.");
  }

  try {
    const data = await sendZapiText(instanceId, token, phone, message);
    return { success: true, messageId: data.messageId || "sent" };
  } catch (error) {
    throw new HttpsError("internal", error instanceof Error ? error.message : "Falha ao enviar mensagem.");
  }
});

/**
 * Callable usada pelo botão "Enviar Teste" em Configurações → WhatsApp.
 * Aceita credenciais explícitas do cliente porque testa valores do
 * formulário ainda não salvos (por isso não pode ler do Firestore).
 */
const VALID_ROLES = ["admin", "medico", "farmaceutico", "recepcionista"] as const;
type UserRole = (typeof VALID_ROLES)[number];

async function requireAdmin(uid: string, db: FirebaseFirestore.Firestore) {
  const callerDoc = await db.collection("users").doc(uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Apenas administradores podem executar esta ação.");
  }
}

/**
 * Concede a role "admin" a quem chamar, mas só enquanto nenhum admin existir
 * ainda. Bootstrap do sistema de permissões: o primeiro a chamar essa função
 * (tipicamente logo após o deploy) vira o administrador da clínica. Depois
 * disso, apenas administradores conseguem conceder acesso via setUserRole.
 */
export const claimFirstAdmin = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }
  const db = getFirestore();
  const uid = request.auth.uid;

  // Transação: o check "nenhum admin existe" e o "me tornar admin" precisam
  // ser atômicos, senão duas chamadas concorrentes (ex: dois usuários clicando
  // no botão logo após o deploy) podem ambas passar o check antes de qualquer
  // escrita valer, e as duas viram admin.
  await db.runTransaction(async (tx) => {
    const existingAdmin = await tx.get(db.collection("users").where("role", "==", "admin").limit(1));
    if (!existingAdmin.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Já existe um administrador cadastrado. Peça para ele conceder seu acesso em Configurações."
      );
    }
    tx.set(db.collection("users").doc(uid), { role: "admin" }, { merge: true });
  });

  await db.collection("audit_logs").add({
    action: "CLAIM_FIRST_ADMIN",
    userId: request.auth.uid,
    userName: request.auth.token.email || "desconhecido",
    targetId: request.auth.uid,
    timestamp: new Date(),
  });

  return { success: true };
});

/**
 * Lista as contas de usuário (users/{uid}) para a tela de administração de
 * permissões. Só administradores podem chamar — é por isso que essa leitura
 * passa por Cloud Function em vez de uma regra de leitura aberta em /users.
 */
export const listUsersForAdmin = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }
  const db = getFirestore();
  await requireAdmin(request.auth.uid, db);

  const snap = await db.collection("users").get();
  return {
    users: snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        role: (data.role as UserRole | undefined) || null,
        nome: data.nome_exibicao || data.name || data.razaoSocial || data.nomeFantasia || "—",
        email: data.email || null,
      };
    }),
  };
});

/**
 * Atribui uma role a um usuário. Só administradores podem chamar. Impede que
 * o único admin do sistema se rebaixe e deixe a clínica sem ninguém com
 * acesso administrativo.
 */
export const setUserRole = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }
  const db = getFirestore();
  await requireAdmin(request.auth.uid, db);

  const { uid, role } = (request.data || {}) as { uid?: string; role?: string };
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes: uid, role");
  }
  if (!VALID_ROLES.includes(role as UserRole)) {
    throw new HttpsError("invalid-argument", `Role inválida. Use uma de: ${VALID_ROLES.join(", ")}`);
  }

  const targetRef = db.collection("users").doc(uid);

  // Transação: o "último admin" só pode ser protegido corretamente se a
  // contagem de admins e a escrita da nova role forem atômicas — senão duas
  // chamadas concorrentes (ex: dois admins rebaixando um ao outro ao mesmo
  // tempo) podem cada uma ver a contagem "segura" antes da outra escrever,
  // zerando os admins. O guard também precisa disparar sempre que o ALVO
  // (não só quando o próprio chamador) está sendo rebaixado de admin.
  await db.runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado.");
    }

    const wasAdmin = targetSnap.data()?.role === "admin";
    if (wasAdmin && role !== "admin") {
      const adminsSnap = await tx.get(db.collection("users").where("role", "==", "admin").limit(2));
      if (adminsSnap.size <= 1) {
        throw new HttpsError(
          "failed-precondition",
          "Você é o único administrador. Promova outro usuário antes de remover seu próprio acesso."
        );
      }
    }

    tx.set(targetRef, { role }, { merge: true });
  });

  await db.collection("audit_logs").add({
    action: "ALTERAR_PERMISSAO_USUARIO",
    userId: request.auth.uid,
    userName: request.auth.token.email || "desconhecido",
    targetId: uid,
    details: { novaRole: role },
    timestamp: new Date(),
  });

  return { success: true };
});

export const sendWhatsappTest = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const { phone, message, instanceId, token } = (request.data || {}) as {
    phone?: string;
    message?: string;
    instanceId?: string;
    token?: string;
  };

  if (!phone || !message || !instanceId || !token) {
    throw new HttpsError(
      "invalid-argument",
      "Campos obrigatórios ausentes: phone, message, instanceId, token"
    );
  }

  try {
    const data = await sendZapiText(instanceId, token, phone, message);
    return { success: true, messageId: data.messageId || "sent" };
  } catch (error) {
    throw new HttpsError("internal", error instanceof Error ? error.message : "Falha ao enviar mensagem.");
  }
});
