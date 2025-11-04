// Database types for events feature

export type EventType =
    | 'meeting'
    | 'workshop'
    | 'review'
    | 'competition'
    | 'practice'
    | 'outreach'
    | 'fundraising'
    | 'training'
    | 'scrimmage'
    | 'other'

export interface Event {
    id: string
    team_id: string
    title: string
    description?: string
    event_type: EventType
    start_date: string // ISO date string
    start_time?: string // HH:MM format
    end_time?: string // HH:MM format
    location?: string
    needs_signup: boolean
    created_by: string
    created_at: string
    updated_at: string
}

export interface EventAttendee {
    id: string
    event_id: string
    team_member_id: string
    status: 'pending' | 'attending' | 'not_attending' | 'maybe'
    response_date: string
    notes?: string
    created_at: string
    updated_at: string
}

// Form types
export interface CreateEventForm {
    title: string
    event_type: EventType
    start_time: string
    end_time: string
    location: string
    description: string
    start_date: string // Selected from calendar
    needs_signup: boolean
}