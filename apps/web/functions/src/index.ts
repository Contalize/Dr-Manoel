import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

const REGION = "southamerica-east1";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
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

      const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

      try {
        const zapiRes = await fetch(zapiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: formatPhone(phone), message }),
        });

        if (zapiRes.ok) {
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
        } else {
          const errText = await zapiRes.text();
          skipped++;
          logger.error(`ERRO Z-API: ${patientName} — ${errText.slice(0, 200)}`);
        }
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

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: formatPhone(phone), message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new HttpsError("internal", `Z-API error: ${error}`);
  }

  const data = (await response.json()) as { messageId?: string };
  return { success: true, messageId: data.messageId || "sent" };
});

/**
 * Callable usada pelo botão "Enviar Teste" em Configurações → WhatsApp.
 * Aceita credenciais explícitas do cliente porque testa valores do
 * formulário ainda não salvos (por isso não pode ler do Firestore).
 */
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

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: formatPhone(phone), message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new HttpsError("internal", `Z-API error: ${error}`);
  }

  const data = (await response.json()) as { messageId?: string };
  return { success: true, messageId: data.messageId || "sent" };
});
