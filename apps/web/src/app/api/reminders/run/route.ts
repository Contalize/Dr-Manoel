import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa o Firebase Admin SDK (apenas no servidor)
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

function getTomorrowStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function POST(req: NextRequest) {
  // Proteção por token secreto
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.REMINDER_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const tomorrowStr = getTomorrowStr();

    // Busca configuração do WhatsApp da clínica
    const waDoc = await db.collection("clinic_settings").doc("whatsapp").get();
    if (!waDoc.exists) {
      return NextResponse.json(
        { error: "WhatsApp não configurado. Acesse Configurações → WhatsApp." },
        { status: 400 }
      );
    }
    const { instanceId, token } = waDoc.data() as { instanceId: string; token: string };

    // Busca todos os agendamentos de amanhã (Agendado ou Confirmado)
    const appointmentsSnap = await db
      .collection("appointments")
      .where("date", "==", tomorrowStr)
      .where("status", "in", ["Scheduled", "Confirmed"])
      .get();

    if (appointmentsSnap.empty) {
      return NextResponse.json({
        success: true,
        message: `Nenhum agendamento para amanhã (${tomorrowStr}).`,
        sent: 0,
        skipped: 0,
      });
    }

    let sent = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const appointmentDoc of appointmentsSnap.docs) {
      const appointment = appointmentDoc.data();
      const { patientName, patientId, time, type } = appointment;

      // Tenta buscar o telefone do paciente
      let phone = "";
      if (patientId) {
        const patientDoc = await db.collection("patients").doc(patientId).get();
        if (patientDoc.exists) {
          phone = (patientDoc.data()?.phone as string) || "";
        }
      }

      if (!phone) {
        skipped++;
        results.push(`SEM TELEFONE: ${patientName}`);
        continue;
      }

      // Verifica se lembrete já foi enviado hoje
      if (appointment.reminderSent === true) {
        skipped++;
        results.push(`JÁ ENVIADO: ${patientName}`);
        continue;
      }

      // Monta a mensagem personalizada
      const [year, month, day] = tomorrowStr.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      const message =
        `Olá, *${patientName}*! 👋\n\n` +
        `Lembramos do seu agendamento para amanhã:\n\n` +
        `📅 *${formattedDate}*\n` +
        `⏰ *${time}*\n` +
        `🏥 *Dr. Manoel da Farmácia*\n` +
        `💊 *${type}*\n\n` +
        `Para confirmar ou reagendar, responda esta mensagem. 💚`;

      // Envia via Z-API
      const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
      const zapiRes = await fetch(zapiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatPhone(phone), message }),
      });

      if (zapiRes.ok) {
        // Marca o agendamento como lembrete enviado
        await appointmentDoc.ref.update({
          reminderSent: true,
          reminderSentAt: new Date().toISOString(),
        });

        // Registra no log de auditoria
        await db.collection("audit_logs").add({
          action: "WHATSAPP_LEMBRETE_AUTOMATICO",
          targetId: appointmentDoc.id,
          details: { paciente: patientName, data: tomorrowStr, horario: time },
          timestamp: new Date(),
          userId: "system",
        });

        sent++;
        results.push(`ENVIADO: ${patientName} (${time})`);
      } else {
        const errText = await zapiRes.text();
        skipped++;
        results.push(`ERRO Z-API: ${patientName} — ${errText.slice(0, 80)}`);
      }
    }

    return NextResponse.json({
      success: true,
      date: tomorrowStr,
      sent,
      skipped,
      results,
    });
  } catch (error) {
    console.error("Erro no sistema de lembretes:", error);
    return NextResponse.json({ error: "Erro interno no servidor de lembretes" }, { status: 500 });
  }
}
