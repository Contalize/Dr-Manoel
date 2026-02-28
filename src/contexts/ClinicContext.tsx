'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface ClinicData {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  cep: string;
  address: string;
  logoUrl?: string;
}

interface Professional {
  id: string;
  name: string;
  role: string;
  registration: string;
  status: 'active' | 'inactive';
}

interface ClinicContextType {
  clinicData: ClinicData | null;
  professionals: Professional[];
  isLoading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to clinic settings
    const unsubClinic = onSnapshot(doc(db, 'clinic_settings', 'main'), (snap) => {
      if (snap.exists()) {
        setClinicData(snap.data() as ClinicData);
      }
    });

    // Listen to active professionals
    const qProfs = query(collection(db, 'professionals'), where('status', '==', 'active'));
    const unsubProfs = onSnapshot(qProfs, (snap) => {
      const profList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));
      setProfessionals(profList);
      setIsLoading(false);
    });

    return () => {
      unsubClinic();
      unsubProfs();
    };
  }, []);

  return (
    <ClinicContext.Provider value={{ clinicData, professionals, isLoading }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
