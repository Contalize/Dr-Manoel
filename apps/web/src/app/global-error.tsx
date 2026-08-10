"use client";

import { useEffect } from "react";

// Última linha de defesa: só ativa se o próprio layout raiz falhar ao renderizar.
// Por isso não importa nada do resto do app (contexts, Firebase, etc.) — precisa
// funcionar mesmo se a causa do erro for uma dessas dependências.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Erro crítico na aplicação:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", background: "#F4F7F5" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <h1 style={{ color: "#2D5A27", fontSize: "22px", marginBottom: "8px" }}>
            Dr. Manoel encontrou um erro inesperado
          </h1>
          <p style={{ color: "#555", fontSize: "14px", maxWidth: "420px", marginBottom: "24px" }}>
            Nenhum dado foi perdido. Recarregue a página; se o problema continuar, contate o suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#2D5A27",
              color: "#F4F7F5",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Recarregar página
          </button>
        </div>
      </body>
    </html>
  );
}
