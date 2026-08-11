export interface Medication {
  tipo: "industrial" | "manipulada";
  nome?: string;
  composicao?: string;
  posologia: string;
  via: string;
  orientacoes?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  chronoAge: number;
  bioAge: number;
  gender: string;
  lastConsultation: unknown;
  lgpdConsent?: boolean;
  status: 'active' | 'inactive';
  notes?: string;
}
