import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'

// Helper function to generate recurring event instances
function generateRecurringInstances(
    parentEvent: { start_date: string; end_date: string; [key: string]: unknown },
    recurrenceType: string,
    interval: number,
    daysOfWeek: number[] | null,
    endDate: string | null,
    maxCount: number | null
) {
    const instances = []
    const startDate = new Date(parentEvent.start_date)
    const endLimit = endDate ? new Date(endDate) : null
    const countLimit = maxCount || 365 // Default max to prevent infinite loops

    const currentDate = new Date(startDate)
    let instanceCount = 0

    // Skip the first instance since the parent event is the first occurrence
    switch (recurrenceType) {
        case 'daily':
            currentDate.setDate(currentDate.getDate() + interval)
            break
        case 'weekly':
            currentDate.setDate(currentDate.getDate() + (7 * interval))
            break
        case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + interval)
            break
        case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + interval)
            break
    }

    while (instanceCount < countLimit && (!endLimit || currentDate <= endLimit)) {
        // For weekly recurrence with specific days
        if (recurrenceType === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
            // Generate instances for each selected day of the week
            for (const dayOfWeek of daysOfWeek) {
                const instanceDate = new Date(currentDate)
                const dayDiff = dayOfWeek - currentDate.getDay()
                instanceDate.setDate(currentDate.getDate() + dayDiff)

                // Only add if the instance is within bounds and not in the past
                if (instanceDate > startDate &&
                    (!endLimit || instanceDate <= endLimit) &&
                    instanceCount < countLimit) {

                    instances.push({
                        title: parentEvent.title,
                        event_type: parentEvent.event_type,
                        start_date: instanceDate.toISOString().split('T')[0],
                        start_time: parentEvent.start_time,
                        end_time: parentEvent.end_time,
                        location: parentEvent.location,
                        description: parentEvent.description,
                        needs_signup: parentEvent.needs_signup,
                        is_recurring: false, // Instances are not recurring themselves
                        parent_event_id: parentEvent.id,
                        team_id: parentEvent.team_id,
                        season_id: parentEvent.season_id,
                        created_by: parentEvent.created_by
                    })

                    instanceCount++
                }
            }
            // Move to next interval
            currentDate.setDate(currentDate.getDate() + (7 * interval))
        } else {
            // For non-weekly or weekly without specific days
            instances.push({
                title: parentEvent.title,
                event_type: parentEvent.event_type,
                start_date: currentDate.toISOString().split('T')[0],
                start_time: parentEvent.start_time,
                end_time: parentEvent.end_time,
                location: parentEvent.location,
                description: parentEvent.description,
                needs_signup: parentEvent.needs_signup,
                is_recurring: false, // Instances are not recurring themselves
                parent_event_id: parentEvent.id,
                team_id: parentEvent.team_id,
                season_id: parentEvent.season_id,
                created_by: parentEvent.created_by
            })

            instanceCount++

            // Move to next occurrence
            switch (recurrenceType) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + interval)
                    break
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + (7 * interval))
                    break
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + interval)
                    break
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + interval)
                    break
            }
        }
    }

    return instances
}

export async function POST(request: NextRequest) {
    try {
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

        return await withAuth(request, async ({ user, teamMember, supabase }) => {
            // Get current season for the team
            const { data: currentSeason, error: seasonError } = await supabase
            .from('seasons')
            .select('id')
            .eq('is_current_season', true)
            .single()

            if (seasonError || !currentSeason) {
                throw new Error('No current season found')
            }

            // Create the main event with proper team_id, season_id, and created_by
            const { data: event, error } = await supabase
            .from('events')
            .insert({
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
                team_id: teamMember.team_id,
                season_id: currentSeason.id,
                created_by: user.id
            })
            .select()
            .single()

            if (error) {
                throw new Error(`Failed to create event: ${error.message}`)
            }

            // If it's a recurring event, generate the recurring instances
            if (is_recurring && event) {
                const instances = generateRecurringInstances(event, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_date, recurrence_count)

                if (instances.length > 0) {
                    const { error: instancesError } = await supabase
                        .from('events')
                        .insert(instances)

                    if (instancesError) {
                        console.error('Error creating recurring instances:', instancesError)
                        // Don't fail the main request, just log the error
                    }
                }
            }

            return NextResponse.json({ event }, { status: 201 })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const start_date = searchParams.get('start_date')
        const end_date = searchParams.get('end_date')

        return await withAuth(request, async ({ teamMember, supabase }) => {
            // Query events for the user's team
            let query = supabase
            .from('events')
            .select('*')
            .eq('team_id', teamMember.team_id)
            .order('start_date', { ascending: true })

            if (start_date) {
                query = query.gte('start_date', start_date)
            }

            if (end_date) {
                query = query.lte('start_date', end_date)
            }

            const { data: events, error } = await query

            if (error) {
                throw new Error(`Failed to fetch events: ${error.message}`)
            }

            return NextResponse.json({ events })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}