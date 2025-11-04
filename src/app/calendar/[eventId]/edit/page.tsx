'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { EventFormContent } from '@/components/calendar/EventFormContent'
import { Button } from '@/components/ui/button'
import { Calendar, Clock } from 'lucide-react'

export default function EditEventPage() {
  const params = useParams()
  const eventId = params?.eventId as string

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Edit Event"
        pageIcon={Clock}
        actions={
          <Link href="/calendar">
            <Button className="btn-accent">
              <Calendar className="w-4 h-4 mr-2" />
              Team Calendar
            </Button>
          </Link>
        }
      >
        <EventFormContent eventId={eventId} mode="edit" />
      </DashboardLayout>
    </ProtectedRoute>
  )
}