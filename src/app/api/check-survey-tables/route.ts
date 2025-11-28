import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Quick check to see if survey tables exist
 */
export async function GET() {
    try {
        // Try to query the surveys table
        const { data, error } = await supabase
            .from('surveys')
            .select('id')
            .limit(1)

        if (error) {
            return NextResponse.json({
                exists: false,
                error: error.message,
                code: error.code,
                hint: error.code === 'PGRST204' || error.code === 'PGRST205'
                    ? 'Table does not exist. You need to run the survey migrations.'
                    : error.hint
            })
        }

        return NextResponse.json({
            exists: true,
            message: 'Survey tables exist and are accessible'
        })

    } catch (error) {
        return NextResponse.json({
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
