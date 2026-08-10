"use client"

import { Suspense } from "react"
import { PatientDetailClient } from "./PatientDetailClient"
import { LoadingState } from "@/components/LoadingState"

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<LoadingState size="lg" className="h-96" />}>
      <PatientDetailClient />
    </Suspense>
  )
}
