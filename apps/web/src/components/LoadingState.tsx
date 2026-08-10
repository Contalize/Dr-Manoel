import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

interface LoadingStateProps {
  size?: keyof typeof SIZES;
  className?: string;
}

/** Spinner centralizado para telas/seções inteiras enquanto os dados carregam. */
export function LoadingState({ size = "md", className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn(SIZES[size], "animate-spin text-primary")} />
    </div>
  );
}
