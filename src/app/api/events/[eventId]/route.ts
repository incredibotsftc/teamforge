import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError, ResourceError } from '@/lib/api-errors'

// GET single event by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params

        return await withAuth(request, async ({ teamMember, supabase }) => {
            // Get the event, ensuring it belongs to the user's team
            const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('team_id', teamMember.team_id)
            .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    throw ResourceError.NOT_FOUND('Event')
                }
                throw new Error(`Failed to fetch event: ${error.message}`)
            }

            return NextResponse.json({ event })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}

// UPDATE event by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params
        const body = await request.json()

        const {
            title,
            event_type,
            start_date,
            start_time,
            end_time,
            location,
            description,
            needs_signup,
            is_recurring,
            recurrence_type,
            recurrence_interval,
            recurrence_days_of_week,
            recurrence_end_date,
            recurrence_count
        } = body

        // Validate required fields
        if (!title || !event_type || !start_date) {
            throw ValidationError.MISSING_FIELDS(['title', 'event_type', 'start_date'])
        }

        return await withAuth(request, async ({ teamMember, supabase }) => {
            // First, let's check the current event data before updating
            const { data: currentEvent } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('team_id', teamMember.team_id)
            .single()

            // Prepare the update data
            const updateData = {
                title,
                event_type,
                start_date,
                start_time,
                end_time,
                location,
                description,
                needs_signup,
                is_recurring,
                recurrence_type,
                recurrence_interval,
                recurrence_days_of_week,
                recurrence_end_date,
                recurrence_count,
                season_id: currentEvent.season_id
            }

            // Update the event, ensuring it belongs to the user's team
            const { error, count } = await supabase
                .from('events')
                .update(updateData)
                .eq('id', eventId)
                .eq('team_id', teamMember.team_id)

            if (error) {
                throw new Error(`Failed to update event: ${error.message}`)
            }

            // Since UPDATE succeeded (no error), fetch the updated event to verify it worked
            const { data: updatedEvent, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .eq('team_id', teamMember.team_id)
                .single()

            if (fetchError || !updatedEvent) {
                // Only return error if count is actually 0 and we can't fetch the updated event
                if (count === 0 || count === null) {
                    throw new Error('Event update blocked by database policy. Please check RLS policies for the events table UPDATE operations.')
                }
            }

            // Compare the fetched data with what we tried to update to see if it actually worked
            const wasActuallyUpdated = updatedEvent && updatedEvent.title === title

            if (!wasActuallyUpdated && (count === 0 || count === null)) {
                throw new Error('Event update blocked by database policy. Please check RLS policies for the events table UPDATE operations.')
            }

            return NextResponse.json({ event: updatedEvent })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}

// DELETE event by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params

        return await withAuth(request, async ({ teamMember, supabase }) => {
            // Delete the event, ensuring it belongs to the user's team
            const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId)
            .eq('team_id', teamMember.team_id)

            if (error) {
                throw new Error(`Failed to delete event: ${error.message}`)
            }

            return NextResponse.json({ message: 'Event deleted successfully' })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}