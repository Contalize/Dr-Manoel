"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAction } from "@/lib/audit";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na área clínica:", error);
    logAction("ERRO_APLICACAO", "N/A", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6">
      <div className="bg-destructive/10 p-4 rounded-full text-destructive mb-4">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        Algo deu errado ao carregar esta página
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        O erro foi registrado. Nenhum dado clínico foi perdido — tente novamente ou volte ao início.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" /> Tentar novamente
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <a href="/">
            <Home className="h-4 w-4" /> Voltar ao início
          </a>
        </Button>
      </div>
    </div>
  );
}
