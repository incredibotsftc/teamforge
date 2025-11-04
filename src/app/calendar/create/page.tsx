'use client'

import Link from 'next/link'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { EventFormContent } from '@/components/calendar/EventFormContent'
import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft } from 'lucide-react'

export default function CreateEventPage() {
  const actions = (
    <Link href="/calendar">
      <Button variant="ghost" size="sm">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Calendar
      </Button>
    </Link>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Create New Event"
        pageIcon={Clock}
        actions={actions}
      >
        <EventFormContent mode="create" />
      </DashboardLayout>
    </ProtectedRoute>
  )
}