import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'
import type { CreateTemplateForm } from '@/types/surveys'

export const dynamic = 'force-dynamic'

// GET - Fetch all survey templates for the team
export async function GET(request: NextRequest) {
  try {
    return await withAuth(request, async ({ teamMember, supabase }) => {
      const { data: templates, error } = await supabase
        .from('survey_templates')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`)
      }

      return NextResponse.json({ templates })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// POST - Create a new survey template
export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async ({ user, teamMember, supabase }) => {
      const body = await request.json() as CreateTemplateForm

      // Validate required fields
      if (!body.name?.trim()) {
        throw ValidationError.MISSING_FIELDS(['name'])
      }

      // Create the template
      const { data: template, error } = await supabase
        .from('survey_templates')
        .insert({
          team_id: teamMember.team_id,
          name: body.name.trim(),
          description: body.description?.trim(),
          header_image_url: body.header_image_url,
          footer_content: body.footer_content,
          footer_html: body.footer_html,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`)
      }

      return NextResponse.json(
        { template, message: 'Template created successfully' },
        { status: 201 }
      )
    })
  } catch (error) {
    return handleAPIError(error)
  }
}