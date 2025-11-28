import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string; channelId: string; messageId: string } }
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
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Verify message belongs to user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Upload file to storage
    const fileName = `${messageId}/${Date.now()}-${file.name}`
    const storagePath = `teams/${params.teamId}/messages/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(storagePath)

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('Attachment record error:', attachmentError)
      // Try to delete the uploaded file
      await supabase.storage
        .from('message-attachments')
        .remove([storagePath])

      return NextResponse.json(
        { error: 'Failed to save attachment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error) {
    console.error('Error in attachment upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
