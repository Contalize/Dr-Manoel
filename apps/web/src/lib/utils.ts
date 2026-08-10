import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Alguns campos (ex: lastConsultation) são gravados como string "dd/MM/yyyy" na
 * criação do registro e como Firestore Timestamp (serverTimestamp()) depois da
 * primeira consulta real. Esta função normaliza os dois formatos para exibição/comparação.
 */
export function formatFirestoreDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate().toLocaleDateString("pt-BR");
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toLocaleDateString("pt-BR");
  }
  return null;
}

/**
 * birthDate é gravado como string "yyyy-MM-dd" ou, em alguns registros, como
 * Firestore Timestamp. Normaliza os dois formatos para um Date local.
 * Usa meio-dia (T12:00:00) ao interpretar a string para evitar o clássico bug
 * de "um dia a menos" quando o fuso do navegador tem offset negativo em relação ao UTC.
 */
export function parseBirthDate(birthDate: unknown): Date | null {
  try {
    if (typeof birthDate === "object" && birthDate !== null && "toDate" in birthDate) {
      return (birthDate as { toDate: () => Date }).toDate();
    }
    if (typeof birthDate === "string") {
      return new Date(birthDate + "T12:00:00");
    }
    return null;
  } catch {
    return null;
  }
}
