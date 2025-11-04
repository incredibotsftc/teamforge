'use client'

import { useState, useRef } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { BigCalendarView, BigCalendarViewHandle } from '@/components/calendar/BigCalendarView'
import { EventFormContent } from '@/components/calendar/EventFormContent'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Calendar, Plus } from 'lucide-react'

export default function CalendarPage() {
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const calendarRef = useRef<BigCalendarViewHandle>(null)

  const handleOpenCreateEvent = () => {
    setEditingEventId(null)
    setIsEventSheetOpen(true)
  }

  const handleOpenEditEvent = (eventId: string) => {
    setEditingEventId(eventId)
    setIsEventSheetOpen(true)
  }

  const handleSuccess = async () => {
    setIsEventSheetOpen(false)
    setEditingEventId(null)
    // Refresh calendar events after successful save/delete
    await calendarRef.current?.refreshEvents()
  }

  const handleCloseSheet = () => {
    setIsEventSheetOpen(false)
    setEditingEventId(null)
    // Don't refresh when just closing without changes
  }

  const actions = (
    <Button className="btn-accent" onClick={handleOpenCreateEvent}>
      <Plus className="w-4 h-4 mr-2" />
      Add Event
    </Button>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Team Calendar"
        pageIcon={Calendar}
        actions={actions}
      >
        <BigCalendarView ref={calendarRef} onEventClick={handleOpenEditEvent} />

        <Sheet open={isEventSheetOpen} onOpenChange={(open) => {
          if (!open) handleCloseSheet()
        }}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-1">
              <SheetTitle>{editingEventId ? 'Edit Event' : 'Create Event'}</SheetTitle>
            </SheetHeader>
            <EventFormContent
              mode={editingEventId ? 'edit' : 'create'}
              eventId={editingEventId || undefined}
              onSuccess={handleSuccess}
            />
          </SheetContent>
        </Sheet>
      </DashboardLayout>
    </ProtectedRoute>
  )
}