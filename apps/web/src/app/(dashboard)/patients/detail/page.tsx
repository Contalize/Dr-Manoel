"use client"

import { Suspense } from "react"
import { PatientDetailClient } from "./PatientDetailClient"
import { Loader2 } from "lucide-react"

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PatientDetailClient />
    </Suspense>
  )
}
