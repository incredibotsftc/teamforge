import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { seasonId } = await request.json()

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Season ID is required' },
        { status: 400 }
      )
    }

    // Get the user's session from the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create authenticated Supabase client using anon key
    // RLS policies ensure only admins can update seasons
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // RLS policy will check if user is an admin before allowing update
    // Step 1: Set all seasons to not current
    const { error: updateAllError } = await supabase
      .from('seasons')
      .update({ is_current_season: false, updated_at: new Date().toISOString() })
      .neq('id', seasonId)

    if (updateAllError) {
      console.error('Error updating all seasons:', updateAllError)
      return NextResponse.json(
        { error: `Failed to update seasons: ${updateAllError.message}` },
        { status: 500 }
      )
    }

    // Step 2: Set the selected season as current
    const { error: updateError } = await supabase
      .from('seasons')
      .update({ is_current_season: true, updated_at: new Date().toISOString() })
      .eq('id', seasonId)

    if (updateError) {
      console.error('Error setting current season:', updateError)
      return NextResponse.json(
        { error: `Failed to set current season: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in set-current API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
