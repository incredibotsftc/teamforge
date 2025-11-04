'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardContent } from '@/components/DashboardContent'
import { Home } from 'lucide-react'

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Dashboard"
        pageIcon={Home}
      >
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
