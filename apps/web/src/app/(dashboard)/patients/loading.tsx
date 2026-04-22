
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PatientsLoading() {
  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-full md:w-48" />
      </header>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border">
        <Skeleton className="h-11 w-full sm:w-96" />
        <Skeleton className="h-11 w-full sm:w-32" />
      </div>

      <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-secondary/5">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="p-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 border-b flex justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
