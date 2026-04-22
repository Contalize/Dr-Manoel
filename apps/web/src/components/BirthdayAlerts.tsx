"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Cake, ChevronRight } from "lucide-react";
import { format, isWithinInterval, addDays, getMonth, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BirthdayAlerts() {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "patients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const in7Days = addDays(today, 7);

      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const upcoming = patients.filter((p: any) => {
        if (!p.birthDate) return false;
        
        let birth: Date;
        if (p.birthDate.toDate) {
          birth = p.birthDate.toDate();
        } else if (typeof p.birthDate === "string") {
          birth = new Date(p.birthDate + "T12:00:00");
        } else {
          return false;
        }

        const currentYearBirthday = new Date(today.getFullYear(), getMonth(birth), getDate(birth));
        
        // If birthday passed this year, check next year
        if (currentYearBirthday.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
           return false;
        }

        return isWithinInterval(currentYearBirthday, {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          end: in7Days
        });
      });

      // Sort by closest
      upcoming.sort((a: any, b: any) => {
        const bdA = a.birthDate.toDate ? a.birthDate.toDate() : new Date(a.birthDate + "T12:00:00");
        const bdB = b.birthDate.toDate ? b.birthDate.toDate() : new Date(b.birthDate + "T12:00:00");
        const aDate = new Date(today.getFullYear(), getMonth(bdA), getDate(bdA));
        const bDate = new Date(today.getFullYear(), getMonth(bdB), getDate(bdB));
        return aDate.getTime() - bDate.getTime();
      });

      setUpcomingBirthdays(upcoming);
    });

    return () => unsubscribe();
  }, []);

  if (upcomingBirthdays.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {upcomingBirthdays.map(patient => {
        let bDate;
        if (patient.birthDate?.toDate) {
          bDate = patient.birthDate.toDate();
        } else {
          bDate = new Date(patient.birthDate + "T12:00:00");
        }

        const isToday = getDate(bDate) === getDate(new Date()) && getMonth(bDate) === getMonth(new Date());

        return (
          <Alert key={patient.id} className="bg-amber-50 border-amber-200 text-amber-900 flex items-center justify-between p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <Cake className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <AlertTitle className="font-bold text-amber-900 mb-0 flex items-center gap-2">
                  {isToday ? "Aniversariante do Dia!" : "Aniversário Próximo"}
                  {isToday && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>}
                </AlertTitle>
                <AlertDescription className="text-amber-800 text-sm mt-0.5 font-medium">
                  {patient.name || "Paciente"} faz aniversário {isToday ? "hoje" : `em ${format(bDate, "dd/MM")}`}.
                </AlertDescription>
              </div>
            </div>
            <Link href={`/patients/detail?id=${patient.id}&tab=history`}>
              <Button size="sm" variant="ghost" className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 font-bold h-8">
                Abrir Dossiê <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </Alert>
        );
      })}
    </div>
  );
}
