import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if messaging tables exist
    const { data, error } = await supabase
      .from('message_channels')
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json(
        { 
          error: 'Messaging tables not found',
          details: error.message,
          hint: 'Run the database migration: database/migrations/0005_messaging.sql'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      status: 'ok',
      message: 'Messaging tables are ready'
    })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
