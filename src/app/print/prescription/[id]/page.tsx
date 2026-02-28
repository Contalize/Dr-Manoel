"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"
import { Loader2, Pill } from "lucide-react"

interface Medication {
  nome: string
  posologia: string
  via: string
  orientacoes?: string
}

interface Prescription {
  patientName: string
  professionalName: string
  professionalRegistration: string
  medications: Medication[]
  notes?: string
  date: any // Firestore Timestamp
}

export default function PrintPrescriptionPage() {
  const params = useParams()
  const id = params.id as string
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrescription() {
      try {
        const docRef = doc(db, "prescriptions", id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setPrescription(docSnap.data() as Prescription)
        }
      } catch (error) {
        console.error("Erro ao buscar receita:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPrescription()
    }
  }, [id])

  useEffect(() => {
    if (!loading && prescription) {
      // Delay pequeno para garantir que as fontes renderizaram antes de chamar o print()
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [loading, prescription])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="p-8 text-center text-red-500">
        <h1>Receita não encontrada.</h1>
      </div>
    )
  }

  // Formatar data
  const dateObj = prescription.date?.toDate ? prescription.date.toDate() : new Date()
  const formattedDate = dateObj.toLocaleDateString("pt-BR")

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0 bg-white min-h-screen">
      {/* Cabeçalho da Clínica */}
      <header className="flex items-center justify-between border-b-2 border-slate-200 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="text-primary print:text-black">
            <Pill className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-headline text-slate-900 tracking-tight">PharmaZen</h1>
            <p className="text-sm text-slate-500 font-medium">Clínica de Farmácia Integrativa</p>
          </div>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>Rua da Saúde, 123 - Centro</p>
          <p>São Paulo, SP</p>
          <p>(11) 99999-9999</p>
        </div>
      </header>

      {/* Dados do Paciente */}
      <div className="mb-10 bg-slate-50 print:bg-transparent p-4 rounded-lg border border-slate-100 print:border-none print:p-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Prescrição para:</h2>
        <p className="text-xl font-bold text-slate-900">{prescription.patientName}</p>
        <p className="text-sm text-slate-500 mt-1">Data de Emissão: {formattedDate}</p>
      </div>

      {/* Medicamentos (Uso Interno/Externo) */}
      <main className="min-h-[400px]">
        {prescription.medications.map((med, index) => (
          <div key={index} className="mb-8">
            <div className="flex items-start gap-4 mb-2">
              <span className="font-bold text-lg text-slate-800">{index + 1}.</span>
              <div className="flex-1 border-b border-dotted border-slate-300 pb-1">
                <h3 className="font-bold text-lg text-slate-900">{med.nome}</h3>
                <span className="text-sm font-medium text-slate-500 uppercase">Uso {med.via}</span>
              </div>
            </div>

            <div className="pl-8 space-y-1">
              <p className="text-base text-slate-800"><span className="font-semibold">Posologia:</span> {med.posologia}</p>
              {med.orientacoes && (
                <p className="text-sm text-slate-600 italic">Obs: {med.orientacoes}</p>
              )}
            </div>
          </div>
        ))}

        {prescription.notes && (
          <div className="mt-12 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Recomendações Clínicas:</h4>
            <p className="text-base text-slate-700 whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}
      </main>

      {/* Assinatura */}
      <footer className="mt-24 pt-8 text-center flex flex-col items-center">
        <div className="w-64 border-t border-slate-400 pt-2">
          <p className="font-bold text-slate-900">{prescription.professionalName}</p>
          <p className="text-sm text-slate-600">{prescription.professionalRegistration}</p>
        </div>
      </footer>

      {/* Botão de impressão escondido no print */}
      <div className="mt-12 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-primary/90"
        >
          Imprimir Novamente
        </button>
      </div>
    </div>
  )
}
