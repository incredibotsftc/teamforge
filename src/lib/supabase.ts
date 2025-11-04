import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if environment variables are configured
export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey)
}

// Lazy-loaded Supabase client to allow build to pass without env vars
let _supabase: SupabaseClient | null = null

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabase) {
            if (!isSupabaseConfigured()) {
                throw new Error('Missing Supabase environment variables')
            }
            _supabase = createClient(supabaseUrl, supabaseAnonKey)
        }
        const value = _supabase[prop as keyof SupabaseClient]
        return typeof value === 'function' ? value.bind(_supabase) : value
    }
})

// Helper function to ensure Supabase is configured before use
function ensureSupabaseConfigured() {
    if (!isSupabaseConfigured()) {
        throw new Error('Missing Supabase environment variables')
    }
}

// Helper function to check database status
export async function checkDatabaseStatus() {
    ensureSupabaseConfigured()

    try {
        // Try to query the teams table
        const { error } = await supabase
            .from('teams')
            .select('id')
            .limit(1)

        if (error) {
            // If error indicates table doesn't exist
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                return { exists: false, error: 'Database tables not found' }
            }
            // Other error
            return { exists: false, error: error.message }
        }

        // Table exists, now check if has_teams function exists and works
        try {
            const { data: hasTeams, error: hasTeamsError } = await supabase.rpc('has_teams')
            if (hasTeamsError) {
                return { exists: true, hasTeams: false, hasCompleteSetup: false, error: 'has_teams function not available' }
            }

            if (!hasTeams) {
                return { exists: true, hasTeams: false, hasCompleteSetup: false }
            }

            // Teams exist, now check if there are any team members
            const { data: teamMembers, error: membersError } = await supabase
                .from('team_members')
                .select('user_id, team_id')
                .limit(1)

            if (membersError) {
                // Team exists but no team members - incomplete setup
                return { exists: true, hasTeams: true, hasCompleteSetup: false, needsUserCreation: true }
            }

            if (!teamMembers || teamMembers.length === 0) {
                // Team exists but no team members - incomplete setup
                return { exists: true, hasTeams: true, hasCompleteSetup: false, needsUserCreation: true }
            }
            // Team and team members exist - setup is complete
            // User just needs to sign in (they may not be authenticated yet due to email verification)
            return { exists: true, hasTeams: true, hasCompleteSetup: true }

        } catch {
            // Function doesn't exist, but table does
            return { exists: true, hasTeams: false, hasCompleteSetup: false, error: 'has_teams function not available' }
        }
    } catch (error) {
        return {
            exists: false,
            hasTeams: false,
            hasCompleteSetup: false,
            error: error instanceof Error ? error.message : 'Database check failed'
        }
    }
}

// Types for our database
export interface Team {
    id: string
    team_number: number
    team_name: string
    school_name?: string
    state?: string
    country?: string
    logo_url?: string
    created_at: string
    updated_at: string
    created_by?: string
}

export interface TeamInsert {
    team_number: number
    team_name: string
    school_name?: string
    state?: string
    country?: string
    logo_url?: string
}