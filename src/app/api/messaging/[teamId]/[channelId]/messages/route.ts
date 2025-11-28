import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
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

    const channelId = params.channelId
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Verify user has access to channel
    const { data: member, error: memberError } = await supabase
      .from('message_channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch messages with author info
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        author:user_id(
          id,
          email,
          user_metadata
        ),
        attachments:message_attachments(*),
        mentions:message_mentions(
          *,
          user:mentioned_user_id(
            id,
            email,
            user_metadata
          )
        ),
        reactions:message_reactions(*)
      `)
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: messages.reverse() })
  } catch (error) {
    console.error('Error in messages GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
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

    const channelId = params.channelId
    const body = await request.json()
    const { content, mentionedUserIds } = body

    // Verify user has access to channel
    const { data: member, error: memberError } = await supabase
      .from('message_channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create message
    const { data: message, error: createError } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating message:', createError)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Add mentions
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const mentions = mentionedUserIds.map((userId: string) => ({
        message_id: message.id,
        mentioned_user_id: userId,
      }))

      await supabase
        .from('message_mentions')
        .insert(mentions)
    }

    // Fetch complete message with relationships
    const { data: completeMessage } = await supabase
      .from('messages')
      .select(`
        *,
        author:user_id(
          id,
          email,
          user_metadata
        ),
        attachments:message_attachments(*),
        mentions:message_mentions(
          *,
          user:mentioned_user_id(
            id,
            email,
            user_metadata
          )
        ),
        reactions:message_reactions(*)
      `)
      .eq('id', message.id)
      .single()

    return NextResponse.json({ message: completeMessage }, { status: 201 })
  } catch (error) {
    console.error('Error in messages POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
