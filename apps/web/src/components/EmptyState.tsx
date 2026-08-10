import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}

/** Card padrão para listas/seções sem itens ainda ("Nenhum X registrado"). */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <Card className="border-none shadow-md bg-white">
      <CardContent className="py-12 text-center">
        <Icon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {action}
      </CardContent>
    </Card>
  );
}
