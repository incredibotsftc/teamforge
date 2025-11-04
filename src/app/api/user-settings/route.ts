import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { handleAPIError } from '@/lib/api-errors';

// GET - Load user settings
export async function GET(request: NextRequest) {
  try {
    return await withAuth(request, async ({ user, supabase }) => {

      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Failed to load user settings: ${error.message}`);
      }

      // Return default settings if no record exists
      const defaultSettings = {
        theme: 'system',
        email_notifications: true,
        discord_notifications: false,
        push_notifications: false,
        event_reminders: true,
        notebook_mentions: true,
        weekly_digest: true,
        push_subscription: null,
        display_name: null,
        preferred_timezone: 'America/Los_Angeles',
        accent_color: '#3b82f6'
      };

      const userSettings = settings || defaultSettings;

      return NextResponse.json({
        success: true,
        settings: userSettings
      });
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST - Save user settings
export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();

    if (!settings) {
      return NextResponse.json({ error: 'Settings data required' }, { status: 400 });
    }

    return await withAuth(request, async ({ user, supabase }) => {

      // Upsert user settings
      const { error: saveError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (saveError) {
        throw new Error(`Failed to save user settings: ${saveError.message}`);
      }


      return NextResponse.json({
        success: true,
        message: 'User settings saved successfully'
      });
    });
  } catch (error) {
    return handleAPIError(error);
  }
}