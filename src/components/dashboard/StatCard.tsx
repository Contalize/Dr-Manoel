import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-md bg-white", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-bold mt-1 text-primary">{value}</h3>
            {trend && (
              <p className={cn(
                "text-xs font-semibold mt-1",
                trend.positive ? "text-green-600" : "text-red-600"
              )}>
                {trend.positive ? "+" : "-"}{trend.value} <span className="text-muted-foreground font-normal">since last month</span>
              </p>
            )}
          </div>
          <div className="bg-secondary p-4 rounded-2xl">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}