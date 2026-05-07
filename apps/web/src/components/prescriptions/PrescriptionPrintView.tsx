"use client"

import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Medication {
  nome: string;
  posologia: string;
  via: string;
  orientacoes?: string;
}

interface PrescriptionPrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientCpf?: string;
  medications: Medication[];
  notes?: string;
  professionalName: string;
  professionalCrf?: string;
  clinicName?: string;
  prescriptionDate?: Date;
}

export function PrescriptionPrintView({
  isOpen,
  onClose,
  patientName,
  patientCpf,
  medications,
  notes,
  professionalName,
  professionalCrf,
  clinicName = "Clínica Dr. Manoel",
  prescriptionDate = new Date(),
}: PrescriptionPrintViewProps) {

  // Injeta estilos de impressão enquanto o componente está aberto
  useEffect(() => {
    if (!isOpen) return;

    const style = document.createElement("style");
    style.id = "dr-manoel-print-styles";
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #dr-manoel-print-root { display: block !important; }
        #dr-manoel-print-root {
          font-family: 'Times New Roman', serif;
          color: #000;
          background: #fff;
          padding: 20mm 20mm 20mm 20mm;
          width: 210mm;
          min-height: 297mm;
        }
      }
      #dr-manoel-print-root {
        display: none;
        position: fixed;
        top: 0; left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        background: white;
        overflow: auto;
      }
      #dr-manoel-print-root.visible {
        display: block;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const s = document.getElementById("dr-manoel-print-styles");
      if (s) s.remove();
    };
  }, [isOpen]);

  // Fecha automaticamente após imprimir
  useEffect(() => {
    if (!isOpen) return;
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dateFormatted = format(prescriptionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div id="dr-manoel-print-root" className="visible">
      {/* Botões de controle — ocultos na impressão */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          gap: "10px",
          zIndex: 10000,
        }}
        className="print:hidden"
      >
        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Fechar
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 24px",
            background: "#2D5A27",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* RECEITA — conteúdo impresso */}
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "40px 48px",
          fontFamily: "'Times New Roman', serif",
          color: "#000",
          backgroundColor: "#fff",
        }}
      >
        {/* Cabeçalho */}
        <div style={{ borderBottom: "2px solid #2D5A27", paddingBottom: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#2D5A27", margin: 0 }}>
                {clinicName}
              </h1>
              <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>
                Farmácia Integrativa &amp; Clínica de Alta Performance
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "12px", color: "#333", margin: 0 }}>
                <strong>{professionalName}</strong>
              </p>
              {professionalCrf && (
                <p style={{ fontSize: "11px", color: "#666", margin: "2px 0 0" }}>
                  {professionalCrf}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h2 style={{ fontSize: "16px", letterSpacing: "0.15em", fontWeight: "normal", textTransform: "uppercase", margin: 0 }}>
            Receituário Farmacêutico
          </h2>
        </div>

        {/* Dados do paciente */}
        <div style={{ marginBottom: "24px", padding: "12px 16px", border: "1px solid #ddd", borderRadius: "4px" }}>
          <p style={{ fontSize: "13px", margin: 0 }}>
            <strong>Paciente:</strong> {patientName}
          </p>
          {patientCpf && (
            <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>
              <strong>CPF:</strong> {patientCpf}
            </p>
          )}
          <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>
            <strong>Data:</strong> {dateFormatted}
          </p>
        </div>

        {/* Medicamentos */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "13px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "6px" }}>
            Prescrição
          </p>
          {medications.length === 0 && (
            <p style={{ fontSize: "13px", color: "#888", fontStyle: "italic" }}>Nenhum medicamento prescrito.</p>
          )}
          {medications.map((med, index) => (
            <div key={index} style={{ marginBottom: "18px", paddingLeft: "12px", borderLeft: "3px solid #2D5A27" }}>
              <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0 0 3px" }}>
                {index + 1}. {med.nome}
              </p>
              <p style={{ fontSize: "13px", margin: "0 0 2px", color: "#333" }}>
                <strong>Via:</strong> {med.via} &nbsp;·&nbsp; <strong>Posologia:</strong> {med.posologia}
              </p>
              {med.orientacoes && (
                <p style={{ fontSize: "12px", color: "#555", margin: "3px 0 0", fontStyle: "italic" }}>
                  Obs: {med.orientacoes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Recomendações */}
        {notes && (
          <div style={{ marginBottom: "32px", padding: "12px 16px", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 4px", textTransform: "uppercase" }}>
              Recomendações
            </p>
            <p style={{ fontSize: "13px", margin: 0, color: "#444" }}>{notes}</p>
          </div>
        )}

        {/* Assinatura */}
        <div style={{ marginTop: "60px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center", minWidth: "260px" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "8px" }}>
              <p style={{ fontSize: "13px", margin: 0, fontWeight: "bold" }}>{professionalName}</p>
              {professionalCrf && (
                <p style={{ fontSize: "12px", color: "#555", margin: "2px 0 0" }}>{professionalCrf}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "12px", textAlign: "center" }}>
          <p style={{ fontSize: "10px", color: "#999", margin: 0 }}>
            Documento gerado pelo Dr. Manoel · Conforme RDC/ANVISA · LGPD Compliant · {dateFormatted}
          </p>
        </div>
      </div>
    </div>
  );
}
