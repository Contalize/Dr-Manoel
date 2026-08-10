import { toast } from "@/hooks/use-toast";

/**
 * Loga o erro no console e mostra um toast destrutivo padronizado.
 * `context` deve ser uma ação no infinitivo (ex: "carregar pacientes"),
 * para compor o título "Erro ao carregar pacientes".
 */
export function notifyError(context: string, error: unknown, description?: string) {
  console.error(`Erro ao ${context}:`, error);
  toast({
    variant: "destructive",
    title: `Erro ao ${context}`,
    description,
  });
}
