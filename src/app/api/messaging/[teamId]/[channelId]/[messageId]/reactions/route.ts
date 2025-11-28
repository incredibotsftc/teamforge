import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
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

    const messageId = params.messageId
    const body = await request.json()
    const { emoji } = body

    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id)

      return NextResponse.json({ deleted: true })
    } else {
      // Add reaction
      const { data: reaction, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding reaction:', error)
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: 500 }
        )
      }

      return NextResponse.json({ reaction }, { status: 201 })
    }
  } catch (error) {
    console.error('Error in reactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
