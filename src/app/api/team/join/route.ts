import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'

// GET - Validate invite code and get team info
export async function GET(request: NextRequest) {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, RateLimitPresets.STRICT)

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: rateLimitResult.headers
            }
        )
    }

    try {
        const { searchParams } = new URL(request.url)
        const inviteCode = searchParams.get('code')

        if (!inviteCode) {
            return NextResponse.json(
                { error: 'Invite code is required' },
                { status: 400 }
            )
        }

        // Use anonymous client to validate invite (RLS policy allows this)
        const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Get invite details with team info
        const { data: invite, error } = await supabaseClient
            .from('team_invites')
            .select(`
                id,
                team_id,
                default_role,
                max_uses,
                current_uses,
                expires_at,
                is_active,
                teams!inner (
                    team_number,
                    team_name,
                    school_name
                )
            `)
            .eq('invite_code', inviteCode)
            .eq('is_active', true)
            .single()

        if (error || !invite) {
            return NextResponse.json(
                { error: 'Invalid or expired invite code' },
                { status: 404 }
            )
        }

        // Check if invite is expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'This invite has expired' },
                { status: 410 }
            )
        }

        // Check if invite has reached max uses
        if (invite.max_uses && invite.current_uses >= invite.max_uses) {
            return NextResponse.json(
                { error: 'This invite has reached its maximum number of uses' },
                { status: 410 }
            )
        }

        // Return invite and team info (safe for anonymous users)
        return NextResponse.json({
            valid: true,
            team: invite.teams,
            default_role: invite.default_role
        })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - Join team using invite code
export async function POST(request: NextRequest) {
    // Apply strict rate limiting for team joins
    const rateLimitResult = await rateLimit(request, RateLimitPresets.TEAM_JOIN)

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: 'Too many join attempts. Please try again later.' },
            {
                status: 429,
                headers: rateLimitResult.headers
            }
        )
    }

    try {
        const body = await request.json()
        const {
            invite_code,
            email,
            password,
            first_name,
            last_name
        } = body

        // Validate required fields
        if (!invite_code || !email || !password || !first_name || !last_name) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Create admin client for operations that need elevated permissions
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // First validate the invite code
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('team_invites')
            .select('id, team_id, default_role, max_uses, current_uses, expires_at, is_active')
            .eq('invite_code', invite_code)
            .eq('is_active', true)
            .single()

        if (inviteError || !invite) {
            return NextResponse.json(
                { error: 'Invalid or expired invite code' },
                { status: 404 }
            )
        }

        // Check if invite is expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'This invite has expired' },
                { status: 410 }
            )
        }

        // Check if invite has reached max uses
        if (invite.max_uses && invite.current_uses >= invite.max_uses) {
            return NextResponse.json(
                { error: 'This invite has reached its maximum number of uses' },
                { status: 410 }
            )
        }

        // Check if user already exists in Supabase auth
        let userId: string

        // Try to get existing user by email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()

        const existingUser = existingUsers?.users?.find(u => u.email === email)

        if (existingUser) {
            // User already exists in auth, just use their ID
            userId = existingUser.id
            console.log('User already exists in Supabase auth, reusing account for team join')

            // Update their password if they provided a new one
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                password,
                user_metadata: {
                    first_name,
                    last_name
                }
            })
        } else {
            // Create new user account
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                user_metadata: {
                    first_name,
                    last_name
                },
                email_confirm: true // Auto-confirm email for invite users
            })

            if (authError) {
                console.error('User creation error:', authError)
                return NextResponse.json(
                    { error: 'Failed to create user account', details: authError.message },
                    { status: 400 }
                )
            }

            if (!authData.user) {
                return NextResponse.json(
                    { error: 'User creation failed - no user data returned' },
                    { status: 500 }
                )
            }

            userId = authData.user.id
        }

        // Check if user is already a member of this team
        const { data: existingMember } = await supabaseAdmin
            .from('team_members')
            .select('id')
            .eq('team_id', invite.team_id)
            .eq('user_id', userId)
            .single()

        if (existingMember) {
            return NextResponse.json(
                { error: 'You are already a member of this team' },
                { status: 400 }
            )
        }

        // Add user to team
        const { error: memberError } = await supabaseAdmin
            .from('team_members')
            .insert({
                team_id: invite.team_id,
                user_id: userId,
                role: invite.default_role,
                first_name,
                last_name,
                email,
                is_active: true
            })

        if (memberError) {
            console.error('Team member creation error:', memberError)
            return NextResponse.json(
                { error: 'Failed to add user to team', details: memberError.message },
                { status: 500 }
            )
        }

        // Update invite usage count
        const { error: updateError } = await supabaseAdmin
            .from('team_invites')
            .update({
                current_uses: invite.current_uses + 1
            })
            .eq('id', invite.id)

        if (updateError) {
            console.warn('Failed to update invite usage count:', updateError)
            // Don't fail the request for this, just log it
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully joined the team! Please sign in with your new credentials.'
        }, { status: 201 })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}