
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CalendarLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-12 md:pt-0">
        <div className="space-y-2">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-primary/5 py-4">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="aspect-square w-full rounded-md" />
            </CardContent>
          </Card>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>

        <div className="lg:col-span-8">
          <Card className="border-none shadow-sm min-h-[600px]">
            <div className="p-6 border-b flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-11 w-full md:w-64 rounded-xl" />
            </div>
            <div className="p-6 space-y-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-6">
                  <Skeleton className="h-6 w-12 shrink-0" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
