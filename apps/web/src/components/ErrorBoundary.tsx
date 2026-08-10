"use client";

import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAction } from "@/lib/audit";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Título mostrado no lugar do conteúdo quebrado. */
  title?: string;
  /** Descrição curta do impacto para quem está usando o sistema. */
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Boundary de erro genérico para envolver widgets/seções isoladas (ex: um painel
 * da ficha do paciente). Se o conteúdo envolvido lançar um erro de render, mostra
 * um estado de falha local com botão de retry, em vez de derrubar a página inteira.
 *
 * Só captura erros de renderização React — não substitui tratamento de erro em
 * chamadas assíncronas (fetch, onSnapshot, etc.), que precisam de try/catch próprio.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, info.componentStack);
    // Best-effort: não bloqueia a UI e já trata sua própria falha internamente.
    logAction("ERRO_APLICACAO", "N/A", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      local: this.props.title || "desconhecido",
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-2.5 rounded-full text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="font-bold text-sm text-destructive">
              {this.props.title || "Algo deu errado ao carregar esta seção"}
            </p>
            {this.props.description && (
              <p className="text-xs text-muted-foreground mt-1">{this.props.description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
            <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
