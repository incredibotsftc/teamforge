import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params
    const cookieStore = await cookies()

    // Create a server-side Supabase client that can read cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    const isAuthenticated = !!session?.user

    // Fetch survey with all questions and template
    const { data: survey, error } = await supabase
      .from('surveys')
      .select(`
        *,
        questions:survey_questions(*),
        template:survey_templates(*)
      `)
      .eq('id', surveyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Survey not found' },
          { status: 404 }
        )
      }
      throw new Error(`Failed to fetch survey: ${error.message}`)
    }

    // Check access permissions based on survey visibility and status
    if (survey.status !== 'published') {
      // Draft/closed surveys: only allow team members to preview
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Survey not available' },
          { status: 403 }
        )
      }

      // Verify user is a team member
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', survey.team_id)
        .eq('user_id', session.user.id)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Survey not available' },
          { status: 403 }
        )
      }
      // Team member can preview draft survey
    } else {
      // Published surveys: check visibility settings
      const visibility = survey.visibility || 'public' // Default to public for backward compatibility

      if (visibility === 'private') {
        // Private surveys require authentication
        if (!isAuthenticated) {
          return NextResponse.json(
            { error: 'Authentication required', message: 'Please log in to access this survey' },
            { status: 401 }
          )
        }
      }
      // Public surveys allow anyone to access
    }

    // Sort questions by sort_order
    if (survey.questions) {
      survey.questions.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    }

    return NextResponse.json(
      { survey },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    return handleAPIError(error)
  }
}