"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Cake, ChevronRight } from "lucide-react";
import { format, addDays, getMonth, getDate, isWithinInterval } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PatientBirthday {
  id: string;
  name: string;
  birthDate: string | { toDate: () => Date };
}

function parseBirthDate(birthDate: PatientBirthday["birthDate"]): Date | null {
  try {
    if (typeof birthDate === "object" && birthDate.toDate) {
      return birthDate.toDate();
    }
    if (typeof birthDate === "string") {
      return new Date(birthDate + "T12:00:00");
    }
    return null;
  } catch {
    return null;
  }
}

export default function BirthdayAlerts() {
  const { user } = useAuth();
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<PatientBirthday[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "patients"),
      where("professionalId", "==", user.uid),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const in7Days = addDays(todayNorm, 7);

      const upcoming = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PatientBirthday))
        .filter((p) => {
          const birth = parseBirthDate(p.birthDate);
          if (!birth) return false;
          const thisYearBirthday = new Date(today.getFullYear(), getMonth(birth), getDate(birth));
          if (thisYearBirthday < todayNorm) return false;
          return isWithinInterval(thisYearBirthday, { start: todayNorm, end: in7Days });
        })
        .sort((a, b) => {
          const bdA = parseBirthDate(a.birthDate)!;
          const bdB = parseBirthDate(b.birthDate)!;
          const dateA = new Date(today.getFullYear(), getMonth(bdA), getDate(bdA));
          const dateB = new Date(today.getFullYear(), getMonth(bdB), getDate(bdB));
          return dateA.getTime() - dateB.getTime();
        });

      setUpcomingBirthdays(upcoming);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (upcomingBirthdays.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {upcomingBirthdays.map((patient) => {
        const bDate = parseBirthDate(patient.birthDate);
        if (!bDate) return null;

        const today = new Date();
        const isToday = getDate(bDate) === getDate(today) && getMonth(bDate) === getMonth(today);

        return (
          <Alert key={patient.id} className="bg-amber-50 border-amber-200 text-amber-900 flex items-center justify-between p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <Cake className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <AlertTitle className="font-bold text-amber-900 mb-0 flex items-center gap-2">
                  {isToday ? "Aniversariante do Dia!" : "Aniversário Próximo"}
                  {isToday && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                </AlertTitle>
                <AlertDescription className="text-amber-800 text-sm mt-0.5 font-medium">
                  {patient.name} faz aniversário {isToday ? "hoje" : `em ${format(bDate, "dd/MM")}`}.
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
