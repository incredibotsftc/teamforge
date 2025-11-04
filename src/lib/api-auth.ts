/**
 * API authentication middleware
 * Eliminates duplicate auth code across API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { AuthError } from './api-errors'
import { env } from './env'

export interface AuthContext {
  user: {
    id: string
    email?: string
  }
  teamMember: {
    id: string
    team_id: string
    role: string
    first_name: string
    last_name: string
    email: string
  }
  supabase: SupabaseClient
}

/**
 * Extracts and validates authentication token from request
 */
function getAuthToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AuthError.NO_TOKEN()
  }

  return authHeader.replace('Bearer ', '')
}

/**
 * Creates authenticated Supabase client
 */
function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

/**
 * Middleware to authenticate and authorize API requests
 * Provides auth context to handler functions
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withAuth(request, async ({ user, teamMember, supabase }) => {
 *     // Your logic here with guaranteed auth context
 *     const data = await supabase.from('events').select('*')
 *     return NextResponse.json(data)
 *   })
 * }
 */
export async function withAuth(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract and validate token
    const token = getAuthToken(request)

    // Create authenticated client
    const supabase = createAuthenticatedClient(token)

    // Get and validate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw AuthError.INVALID_TOKEN()
    }

    // Get team membership
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('id, team_id, role, first_name, last_name, email')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (teamError || !teamMember) {
      throw AuthError.NOT_TEAM_MEMBER()
    }

    // Execute handler with auth context
    return await handler({
      user: {
        id: user.id,
        email: user.email
      },
      teamMember,
      supabase
    })
  } catch (error) {
    // Let api-errors handle the response
    throw error
  }
}

/**
 * Middleware that requires admin role
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withAdminAuth(request, async ({ user, teamMember, supabase }) => {
 *     // Only admins can reach this code
 *     return NextResponse.json({ success: true })
 *   })
 * }
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    if (context.teamMember.role !== 'admin') {
      throw AuthError.ADMIN_REQUIRED()
    }
    return handler(context)
  })
}

/**
 * Middleware that requires mentor or admin role
 */
export async function withMentorAuth(
  request: NextRequest,
  handler: (context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (context) => {
    const role = context.teamMember.role
    if (role !== 'admin' && role !== 'mentor') {
      throw AuthError.MENTOR_REQUIRED()
    }
    return handler(context)
  })
}

/**
 * Creates an authenticated Supabase admin client
 * Use sparingly - only for operations that require service role
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    env.supabase.url,
    env.supabase.serviceKey
  )
}
