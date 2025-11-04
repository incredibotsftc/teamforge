import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'

// GET - List team invites for admins
export async function GET(request: NextRequest) {
    try {
        return await withAdminAuth(request, async ({ teamMember, supabase }) => {
            // Get team invites
            const { data: invites, error } = await supabase
                .from('team_invites')
                .select('*')
                .eq('team_id', teamMember.team_id)
                .order('created_at', { ascending: false })

            if (error) {
                throw new Error(`Failed to fetch team invites: ${error.message}`)
            }

            return NextResponse.json({ invites: invites || [] })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}

// POST - Create new team invite
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            default_role = 'student',
            max_uses = null,
            expires_in_days = null
        } = body

        // Validate role
        const validRoles = ['admin', 'mentor', 'student', 'guest']
        if (!validRoles.includes(default_role)) {
            throw ValidationError.INVALID_FORMAT(
                'default_role',
                validRoles.join(', ')
            )
        }

        return await withAdminAuth(request, async ({ user, teamMember, supabase }) => {
            // Generate invite code
            const { data: codeResult, error: codeError } = await supabase
                .rpc('generate_invite_code')

            if (codeError || !codeResult) {
                throw new Error('Failed to generate invite code')
            }

            // Calculate expiration date if specified
            let expires_at = null
            if (expires_in_days) {
                const expirationDate = new Date()
                expirationDate.setDate(expirationDate.getDate() + expires_in_days)
                expires_at = expirationDate.toISOString()
            }

            // Create the invite
            const { data: invite, error } = await supabase
                .from('team_invites')
                .insert({
                    team_id: teamMember.team_id,
                    invite_code: codeResult,
                    created_by: user.id,
                    default_role,
                    max_uses,
                    expires_at
                })
                .select()
                .single()

            if (error) {
                throw new Error(`Failed to create invite: ${error.message}`)
            }

            return NextResponse.json({ invite }, { status: 201 })
        })
    } catch (error) {
        return handleAPIError(error)
    }
}
