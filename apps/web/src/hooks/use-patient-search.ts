"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { notifyError } from "@/lib/notify-error";

export interface PatientSearchResult {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
}

interface UsePatientSearchOptions {
  /** Tamanho mínimo do termo para disparar a busca (padrão: 2). */
  minLength?: number;
  /** Máximo de resultados retornados (padrão: 6). */
  maxResults?: number;
  /** Restringe a busca a pacientes com status "active" (padrão: false, busca todos). */
  activeOnly?: boolean;
}

/**
 * Busca pacientes do profissional logado por nome ou CPF, com debounce de 300ms.
 * Escopo sempre isolado por professionalId (mesma regra de segurança do Firestore).
 */
export function usePatientSearch(term: string, options?: UsePatientSearchOptions) {
  const { user } = useAuth();
  const minLength = options?.minLength ?? 2;
  const maxResults = options?.maxResults ?? 6;
  const activeOnly = options?.activeOnly ?? false;
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (term.length < minLength || !user?.uid) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const constraints = [where("professionalId", "==", user.uid)];
        if (activeOnly) constraints.push(where("status", "==", "active"));
        const q = query(collection(db, "patients"), ...constraints, limit(100));
        const snap = await getDocs(q);
        const all: PatientSearchResult[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          cpf: d.data().cpf as string,
          phone: d.data().phone as string | undefined,
          birthDate: d.data().birthDate as string | undefined,
          gender: d.data().gender as string | undefined,
        }));
        const needle = term.toLowerCase();
        setResults(
          all
            .filter((p) => p.name?.toLowerCase().includes(needle) || p.cpf?.includes(needle))
            .slice(0, maxResults)
        );
      } catch (error) {
        notifyError("buscar pacientes", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [term, user?.uid, minLength, maxResults, activeOnly]);

  return { results, isSearching };
}
