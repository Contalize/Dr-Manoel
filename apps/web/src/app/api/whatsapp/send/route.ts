import { NextRequest, NextResponse } from "next/server";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message, instanceId, token } = body as {
      phone: string;
      message: string;
      instanceId: string;
      token: string;
    };

    if (!phone || !message || !instanceId || !token) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: phone, message, instanceId, token" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: formattedPhone, message }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Z-API error: ${error}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as { messageId?: string };
    return NextResponse.json({ success: true, messageId: data.messageId || "sent" });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Erro interno no envio" }, { status: 500 });
  }
}
