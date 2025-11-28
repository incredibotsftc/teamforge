import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const teamId = params.teamId

    // Fetch all channels for the team that the user is a member of
    const { data: channels, error } = await supabase
      .from('message_channels')
      .select(`
        *,
        message_channel_members!inner(user_id)
      `)
      .eq('team_id', teamId)
      .eq('message_channel_members.user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 500 }
      )
    }

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error in channels GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { teamId: string } }
) {
  const { params } = context; // Await params here
  try {
    console.log('POST /channels called with teamId:', params.teamId)
    const headersList = await headers()
    const authHeader = headersList.get('authorization')

    if (!authHeader) {
      console.log('No auth header')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log('Auth error:', authError, 'User:', user)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Authenticated user:', user.id)
    const body = await request.json()
    const { name, description } = body
    const teamId = params.teamId

    console.log('Creating channel:', { teamId, name, description })

    // Verify user is a team member
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (memberError) {
      console.error('Member check error:', memberError)
    }
    if (memberError || !teamMember) {
      console.log('Not a team member:', { memberError, teamMember })
      return NextResponse.json(
        { error: 'Not a team member' },
        { status: 403 }
      )
    }

    console.log('User is team member, creating channel...')
    // Create new channel
    const { data: channel, error: createError } = await supabase
      .from('message_channels')
      .insert({
        team_id: teamId,
        name,
        description,
        is_direct_message: false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating channel:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
      })
      return NextResponse.json(
        {
          error: 'Failed to create channel',
          details: createError.message,
          hint: createError.hint,
        },
        { status: 500 }
      )
    }

    console.log('Channel created successfully:', channel.id)

    // Add creator as channel member
    const { error: memberInsertError } = await supabase
      .from('message_channel_members')
      .insert({
        channel_id: channel.id,
        user_id: user.id,
      })

    if (memberInsertError) {
      console.error('Error adding channel member:', memberInsertError)
      // Don't fail - channel is created, just log the member add error
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Error in channels POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
