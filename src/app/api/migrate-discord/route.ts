import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Test if Discord fields exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('team_members')
      .select('discord_user_id, discord_username')
      .limit(1);
    
    if (testError && testError.message.includes('column "discord_user_id" does not exist')) {
      // Fields don't exist, we need to add them manually
      // Since we can't run DDL through the client, provide instructions
      return NextResponse.json({ 
        error: 'Discord fields need to be added', 
        message: 'Please add Discord fields to the database',
        sql: `
-- Run this SQL in your Supabase SQL editor:
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS discord_user_id text,
ADD COLUMN IF NOT EXISTS discord_username text;

CREATE INDEX IF NOT EXISTS team_members_discord_user_id_idx ON public.team_members(discord_user_id);
        `.trim()
      }, { status: 202 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Discord fields are available',
      hasData: testData ? testData.length > 0 : false
    });
  } catch (error) {
    console.error('Migration check error:', error);
    return NextResponse.json({ error: 'Migration check failed', details: error }, { status: 500 });
  }
}